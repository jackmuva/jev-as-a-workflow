import { useEffect, useState } from 'react';
import type { SessionUsageState } from '../../models/session-usage';
import {
  getSessionUsageState,
  subscribeSessionCost,
} from '../../services/llm/session-cost';

export const useSessionCost = (): SessionUsageState => {
  const [usage, setUsage] = useState<SessionUsageState>(() => getSessionUsageState());

  useEffect(() => subscribeSessionCost(() => {
    setUsage(getSessionUsageState());
  }), []);

  return usage;
};
