import { APICallError } from '@ai-sdk/provider';
import { describe, expect, test } from 'bun:test';
import type { JevMessage } from '../../../models/agent';
import { COMPACTION_CONTEXT_WINDOW, COMPACTION_TOKEN_THRESHOLD } from '../../../constants';
import { estimateMessagesTokens, isContextLimitApiError, withCompactionRetry } from './compaction';

const largeToolResult = (size: number): JevMessage => ({ message: {
  role: 'tool',
  content: [{
    type: 'tool-result',
    toolCallId: 'call-1',
    toolName: 'default/read_file',
    output: { type: 'text', value: 'x'.repeat(size) },
  }],
} });

describe('estimateMessagesTokens', () => {
  test('counts full tool-result payloads, not a truncated preview', () => {
    const payloadSize = 30_000;
    const messages: JevMessage[] = [
      { message: { role: 'user', content: 'read the file' } },
      largeToolResult(payloadSize),
    ];

    const estimate = estimateMessagesTokens(messages);
    const truncatedPreviewTokens = Math.ceil(500 / 3);

    expect(estimate).toBeGreaterThan(truncatedPreviewTokens * 10);
    expect(estimate).toBeGreaterThanOrEqual(Math.ceil(payloadSize / 3));
  });

  test('exceeds compaction threshold when history is large enough', () => {
    const messages: JevMessage[] = [
      { message: { role: 'user', content: 'analyze these files' } },
      largeToolResult(80_000),
    ];

    const estimate = estimateMessagesTokens(messages);
    const tokenLimit = COMPACTION_CONTEXT_WINDOW * COMPACTION_TOKEN_THRESHOLD;

    expect(estimate).toBeGreaterThan(tokenLimit);
  });
});

describe('isContextLimitApiError', () => {
  test('detects HTTP 400 from the API', () => {
    const error = new APICallError({
      message: 'Bad Request',
      url: 'https://example.com',
      requestBodyValues: {},
      statusCode: 400,
    });
    expect(isContextLimitApiError(error)).toBe(true);
  });

  test('detects context-related message text', () => {
    const error = new APICallError({
      message: 'maximum context length exceeded',
      url: 'https://example.com',
      requestBodyValues: {},
      statusCode: 422,
    });
    expect(isContextLimitApiError(error)).toBe(true);
  });

  test('ignores unrelated errors', () => {
    expect(isContextLimitApiError(new Error('network'))).toBe(false);
    const error = new APICallError({
      message: 'invalid api key',
      url: 'https://example.com',
      requestBodyValues: {},
      statusCode: 401,
    });
    expect(isContextLimitApiError(error)).toBe(false);
  });
});

describe('withCompactionRetry', () => {
  test('does not retry unrelated errors', async () => {
    let calls = 0;
    await expect(withCompactionRetry([], async () => {
      calls += 1;
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(calls).toBe(1);
  });
});
