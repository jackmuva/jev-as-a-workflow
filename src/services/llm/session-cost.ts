import type { ProviderMetadata } from 'ai';
import type { SessionUsageState } from '../../models/session-usage';
import { parseGatewayCostUsd } from './gateway-cost';

type LlmUsageSource = {
  providerMetadata?: ProviderMetadata;
};

let sessionCostUsd = 0;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

export const getSessionUsageState = (): SessionUsageState => ({
  sessionCostUsd,
});

export const resetSessionCost = (): void => {
  sessionCostUsd = 0;
  notify();
};

/** Adds gateway-reported inference cost when present. */
export const recordLlmUsage = (source: LlmUsageSource): void => {
  const delta = parseGatewayCostUsd(source.providerMetadata);
  if (delta == null || delta <= 0) return;
  sessionCostUsd += delta;
  notify();
};

export const subscribeSessionCost = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
