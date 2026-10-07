import { describe, expect, test } from 'bun:test';
import { tokensFromLlmUsage } from './usage-tokens';

describe('tokensFromLlmUsage', () => {
  test('uses totalTokens when present', () => {
    expect(tokensFromLlmUsage({ totalTokens: 1200, inputTokens: 1000, outputTokens: 200 })).toBe(1200);
  });

  test('falls back to input plus output', () => {
    expect(tokensFromLlmUsage({ inputTokens: 800, outputTokens: 150 })).toBe(950);
  });

  test('returns zero when usage is missing', () => {
    expect(tokensFromLlmUsage(undefined)).toBe(0);
  });
});
