/** In-memory session LLM metrics (not persisted; resets on /clear or session switch). */
export type SessionUsageState = {
  sessionCostUsd: number;
  /** Sum of per-call token usage reported by the gateway via the AI SDK `usage` field. */
  sessionTokensUsed: number;
};
