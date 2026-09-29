import { describe, expect, test } from 'bun:test';
import type { JevMessage } from '../../../models/agent';
import { COMPACTION_CONTEXT_WINDOW, COMPACTION_TOKEN_THRESHOLD } from '../../../constants';
import { estimateMessagesTokens } from './compaction';

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
