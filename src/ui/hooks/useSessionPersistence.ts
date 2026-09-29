import type { ModelMessage } from 'ai';
import { resolve } from 'node:path';
import { useCallback, useMemo, useState } from 'react';
import { SessionStore, type SessionRecord } from '../../services/session/store';

type SetMessagesAction = ModelMessage[] | ((previous: ModelMessage[]) => ModelMessage[]);

export type UseSessionPersistenceResult = {
  messages: ModelMessage[];
  setMessages: (update: SetMessagesAction) => void;
  clearSession: () => void;
  getSessions: () => SessionRecord[];
  resumeSession: (sessionId: string) => void;
  session: SessionRecord;
};

export const useSessionPersistence = (
  seedMessages: ModelMessage[],
  workspacePath = process.cwd(),
): UseSessionPersistenceResult => {
  const store = useMemo(() => SessionStore.open(), []);
  const workspace = useMemo(() => resolve(workspacePath), [workspacePath]);
  const [session, setSession] = useState<SessionRecord>(() =>
    store.getOrCreateSession(workspace),
  );

  const [messages, setMessagesState] = useState<ModelMessage[]>(() => {
    const saved = store.loadMessages(session.id);
    return [...seedMessages, ...saved];
  });

  const setMessages = useCallback((update: SetMessagesAction) => {
    setMessagesState((previous) => {
      const next = typeof update === 'function' ? update(previous) : update;
      store.saveMessages(session.id, next);
      return next;
    });
  }, [session.id, store]);

  const clearSession = useCallback(() => {
    const next = [...seedMessages];
    store.saveMessages(session.id, next);
    setMessagesState(next);
  }, [seedMessages, session.id, store]);

  const getSessions = useCallback(() => store.listSessions(workspace), [store, workspace]);

  const resumeSession = useCallback((sessionId: string) => {
    const target = store.listSessions(workspace).find((entry) => entry.id === sessionId);
    if (!target) return;

    setSession(target);
    const saved = store.loadMessages(sessionId);
    setMessagesState([...seedMessages, ...saved]);
  }, [seedMessages, store, workspace]);

  return { messages, setMessages, clearSession, getSessions, resumeSession, session };
};
