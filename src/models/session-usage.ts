/** In-memory session spend (not persisted; resets on /clear or session switch). */
export type SessionUsageState = {
  sessionCostUsd: number;
};
