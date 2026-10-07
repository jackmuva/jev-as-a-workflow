import type { ProviderMetadata } from 'ai';
export type SessionUsageState = {
  sessionCostUsd: number;
  /** Sum of per-call total tokens from gateway `usage`. */
  sessionTokensUsed: number;
  /** Prompt tokens from the most recent model call (context window fill). */
  lastInputTokens: number;
};

type LlmUsageSource = {
  usage?: {
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    totalTokens?: number | undefined;
  };
  providerMetadata?: ProviderMetadata;
};

let sessionCostUsd = 0;
let sessionTokensUsed = 0;
let lastInputTokens = 0;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

export const getSessionUsageState = (): SessionUsageState => ({
  sessionCostUsd,
  sessionTokensUsed,
  lastInputTokens,
});

export const resetSessionUsage = (): void => {
  sessionCostUsd = 0;
  sessionTokensUsed = 0;
  lastInputTokens = 0;
  notify();
};

export const recordLlmUsage = (source: LlmUsageSource): void => {
  let changed = false;

  const gateway = source.providerMetadata?.gateway;
  if (gateway && typeof gateway === 'object') {
    const rawCost = (gateway as Record<string, unknown>).cost;
    const cost = typeof rawCost === 'number'
      ? rawCost
      : typeof rawCost === 'string'
        ? Number.parseFloat(rawCost)
        : NaN;
    if (Number.isFinite(cost) && cost > 0) {
      sessionCostUsd += cost;
      changed = true;
    }
  }

  const usage = source.usage;
  if (usage?.inputTokens != null && usage.inputTokens > 0) {
    lastInputTokens = usage.inputTokens;
    changed = true;
  }

  if (usage) {
    const total = usage.totalTokens != null && usage.totalTokens > 0
      ? usage.totalTokens
      : (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
    if (total > 0) {
      sessionTokensUsed += total;
      changed = true;
    }
  }

  if (changed) notify();
};

export const subscribeSessionUsage = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
