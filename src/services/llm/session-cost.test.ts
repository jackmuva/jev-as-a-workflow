import { afterEach, describe, expect, test } from 'bun:test';
import {
  getSessionUsageState,
  recordLlmUsage,
  resetSessionCost,
} from './session-cost';

describe('session-cost', () => {
  afterEach(() => {
    resetSessionCost();
  });

  test('accumulates gateway cost for the session', () => {
    recordLlmUsage({ providerMetadata: { gateway: { cost: '0.002' } } });
    recordLlmUsage({ providerMetadata: { gateway: { cost: '0.0015' } } });
    expect(getSessionUsageState().sessionCostUsd).toBeCloseTo(0.0035);
  });

  test('reset clears accumulated cost', () => {
    recordLlmUsage({ providerMetadata: { gateway: { cost: '0.01' } } });
    resetSessionCost();
    expect(getSessionUsageState().sessionCostUsd).toBe(0);
  });
});
