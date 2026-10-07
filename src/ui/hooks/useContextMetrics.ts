import { useMemo } from 'react';
import { COMPACTION_CONTEXT_WINDOW } from '../../constants';
import type { JevMessage } from '../../models/agent';
import { estimateMessagesTokens } from '../../services/agent/hooks/compaction';

export type ContextMetrics = {
  contextPercent: number;
  estimatedTokens: number;
  contextWindow: number;
};

export const useContextMetrics = (messages: JevMessage[]): ContextMetrics => useMemo(() => {
  const estimatedTokens = estimateMessagesTokens(messages);
  const rawPercent = (estimatedTokens / COMPACTION_CONTEXT_WINDOW) * 100;
  const contextPercent = Math.min(100, Math.max(0, Math.round(rawPercent)));

  return {
    contextPercent,
    estimatedTokens,
    contextWindow: COMPACTION_CONTEXT_WINDOW,
  };
}, [messages]);
