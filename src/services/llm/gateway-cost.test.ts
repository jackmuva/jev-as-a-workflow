import { describe, expect, test } from 'bun:test';
import { parseGatewayCostUsd } from './gateway-cost';

describe('parseGatewayCostUsd', () => {
  test('parses decimal string cost from gateway metadata', () => {
    expect(parseGatewayCostUsd({
      gateway: { cost: '0.0045405', generationId: 'gen_123' },
    })).toBe(0.0045405);
  });

  test('parses numeric cost', () => {
    expect(parseGatewayCostUsd({
      gateway: { cost: 0.01 },
    })).toBe(0.01);
  });

  test('returns undefined when metadata is missing', () => {
    expect(parseGatewayCostUsd(undefined)).toBeUndefined();
    expect(parseGatewayCostUsd({})).toBeUndefined();
    expect(parseGatewayCostUsd({ gateway: { generationId: 'x' } })).toBeUndefined();
  });
});
