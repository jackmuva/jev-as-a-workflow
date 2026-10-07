import type { ProviderMetadata } from 'ai';
import type { SessionUsageState } from '../../models/session-usage';
import { parseGatewayCostUsd } from './gateway-cost';
import { tokensFromLlmUsage, type LlmUsageTokens } from './usage-tokens';

type LlmUsageSource = {
  usage?: LlmUsageTokens;
  providerMetadata?: ProviderMetadata;
};

let sessionCostUsd = 0;
let sessionTokensUsed = 0;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

export const getSessionUsageState = (): SessionUsageState => ({
  sessionCostUsd,
  sessionTokensUsed,
});

export const resetSessionCost = (): void => {
  sessionCostUsd = 0;
  sessionTokensUsed = 0;
  notify();
};

/**
 * Records one LLM call: cost from `providerMetadata.gateway`, tokens from AI SDK `usage`
 * (populated by Vercel AI Gateway on each completion — not in gateway providerMetadata).
 */
export const recordLlmUsage = (source: LlmUsageSource): void => {
  let changed = false;

  const costDelta = parseGatewayCostUsd(source.providerMetadata);
  if (costDelta != null && costDelta > 0) {
    sessionCostUsd += costDelta;
    changed = true;
  }

  const tokenDelta = tokensFromLlmUsage(source.usage);
  if (tokenDelta > 0) {
    sessionTokensUsed += tokenDelta;
    changed = true;
  }

  if (changed) notify();
};

export const subscribeSessionCost = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
