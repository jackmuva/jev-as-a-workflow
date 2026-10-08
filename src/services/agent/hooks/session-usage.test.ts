import { afterEach, describe, expect, test } from 'bun:test';
import {
  getSessionUsageState,
  recordLlmUsage,
  resetSessionUsage,
} from './session-usage';

describe('session-usage', () => {
  afterEach(() => {
    resetSessionUsage();
  });

  test('tracks cost, cumulative tokens, and last input tokens', () => {
    recordLlmUsage({
      providerMetadata: { gateway: { cost: '0.002' } },
      usage: { inputTokens: 8000, outputTokens: 200, totalTokens: 8200 },
    });
    recordLlmUsage({
      providerMetadata: { gateway: { cost: '0.001' } },
      usage: { inputTokens: 12000, outputTokens: 100, totalTokens: 12100 },
    });

    expect(getSessionUsageState()).toEqual({
      sessionCostUsd: 0.003,
      sessionTokensUsed: 20300,
      lastInputTokens: 12000,
    });
  });

  test('reset clears state', () => {
    recordLlmUsage({ usage: { inputTokens: 100, totalTokens: 150 } });
    resetSessionUsage();
    expect(getSessionUsageState()).toEqual({
      sessionCostUsd: 0,
      sessionTokensUsed: 0,
      lastInputTokens: 0,
    });
  });
});
