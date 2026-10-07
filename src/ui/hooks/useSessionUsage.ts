import { useEffect, useState } from 'react';
import { COMPACTION_CONTEXT_WINDOW } from '../../constants';
import {
  getSessionUsageState,
  subscribeSessionUsage,
} from '../../services/llm/session-usage';

export const useSessionUsage = () => {
  const [state, setState] = useState(getSessionUsageState);

  useEffect(() => subscribeSessionUsage(() => {
    setState(getSessionUsageState());
  }), []);

  const contextPercent = state.lastInputTokens <= 0
    ? 0
    : Math.min(100, Math.round((state.lastInputTokens / COMPACTION_CONTEXT_WINDOW) * 100));

  return { ...state, contextPercent };
};
