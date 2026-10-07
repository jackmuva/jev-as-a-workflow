import type { ProviderMetadata } from 'ai';

/** Parses Vercel AI Gateway `providerMetadata.gateway.cost` (decimal string or number). */
export const parseGatewayCostUsd = (
  providerMetadata: ProviderMetadata | undefined,
): number | undefined => {
  if (!providerMetadata) return undefined;

  const gateway = providerMetadata.gateway;
  if (!gateway || typeof gateway !== 'object') return undefined;

  const cost = (gateway as Record<string, unknown>).cost;
  if (typeof cost === 'number' && Number.isFinite(cost)) return cost;
  if (typeof cost === 'string') {
    const parsed = Number.parseFloat(cost);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};
