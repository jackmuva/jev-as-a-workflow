import { describe, expect, test } from 'bun:test';
import { APICallError, UnsupportedFunctionalityError } from 'ai';
import {
  isStructuredOutputUnsupported,
  parseGeneratedWorkflowJson,
  WorkflowGenerationError,
} from './generate';

describe('parseGeneratedWorkflowJson', () => {
  test('parses raw JSON', () => {
    const workflow = parseGeneratedWorkflowJson(JSON.stringify({
      title: 'Ship feature',
      goal: 'Add workflow fallback',
      steps: [{ intent: 'Edit code', action: 'Update generate.ts' }],
    }));
    expect(workflow.title).toBe('Ship feature');
    expect(workflow.steps).toHaveLength(1);
  });

  test('strips markdown fences', () => {
    const workflow = parseGeneratedWorkflowJson(`\`\`\`json
{"title":"T","goal":"G","steps":[{"intent":"i","action":"a"}]}
\`\`\``);
    expect(workflow.goal).toBe('G');
  });

  test('throws on invalid JSON', () => {
    expect(() => parseGeneratedWorkflowJson('not json')).toThrow(WorkflowGenerationError);
  });
});

describe('isStructuredOutputUnsupported', () => {
  test('detects unsupported functionality errors', () => {
    expect(isStructuredOutputUnsupported(new UnsupportedFunctionalityError({
      functionality: 'structured outputs',
    }))).toBe(true);
  });

  test('detects gateway output format errors', () => {
    expect(isStructuredOutputUnsupported(new APICallError({
      message: 'Model does not support the output format',
      url: 'https://example.com',
      requestBodyValues: {},
    }))).toBe(true);
  });

  test('ignores unrelated API errors', () => {
    expect(isStructuredOutputUnsupported(new APICallError({
      message: 'Rate limit exceeded',
      url: 'https://example.com',
      requestBodyValues: {},
    }))).toBe(false);
  });
});
