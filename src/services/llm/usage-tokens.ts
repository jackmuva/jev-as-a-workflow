/** Token fields shared by generateText usage and evaluate usage. */
export type LlmUsageTokens = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
};

/** Tokens billed for one model call (prefers gateway/SDK totalTokens). */
export const tokensFromLlmUsage = (usage: LlmUsageTokens | undefined): number => {
  if (!usage) return 0;

  if (usage.totalTokens != null && usage.totalTokens > 0) {
    return usage.totalTokens;
  }

  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const sum = input + output;
  return sum > 0 ? sum : 0;
};
