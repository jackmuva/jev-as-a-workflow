import type { JevMessage } from '../../models/agent';
import { resolve } from 'node:path';
import { useCallback, useMemo, useState } from 'react';
import { SessionStore, type SessionRecord } from '../../services/session/store';

type SetMessagesAction = JevMessage[] | ((previous: JevMessage[]) => JevMessage[]);

export type UseSessionPersistenceResult = {
  messages: JevMessage[];
  setMessages: (update: SetMessagesAction) => void;
  clearSession: () => void;
  getSessions: () => SessionRecord[];
  resumeSession: (sessionId: string) => void;
  replaceSeedMessages: (seed: JevMessage[]) => void;
  session: SessionRecord;
};

export const useSessionPersistence = (
  initialSeedMessages: JevMessage[],
  workspacePath = process.cwd(),
): UseSessionPersistenceResult => {
  const [seedMessages, setSeedMessages] = useState(initialSeedMessages);
  const store = useMemo(() => SessionStore.open(), []);
  const workspace = useMemo(() => resolve(workspacePath), [workspacePath]);
  const [session, setSession] = useState<SessionRecord>(() =>
    store.getOrCreateSession(workspace),
  );

  const [messages, setMessagesState] = useState<JevMessage[]>(() => {
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

  // Start a fresh session instead of wiping the current one, so it stays resumable.
  const clearSession = useCallback(() => {
    const hasConversation = store.loadMessages(session.id).length > 0;
    if (hasConversation) setSession(store.createSession(workspace));
    setMessagesState([...seedMessages]);
  }, [seedMessages, session.id, store, workspace]);

  const getSessions = useCallback(() => store.listSessions(workspace), [store, workspace]);

  const resumeSession = useCallback((sessionId: string) => {
    const target = store.listSessions(workspace).find((entry) => entry.id === sessionId);
    if (!target) return;

    setSession(target);
    const saved = store.loadMessages(sessionId);
    setMessagesState([...seedMessages, ...saved]);
  }, [seedMessages, store, workspace]);

  // System messages are never persisted, so they are all seed messages.
  const replaceSeedMessages = useCallback((seed: JevMessage[]) => {
    setSeedMessages(seed);
    setMessagesState((previous) => [
      ...seed,
      ...previous.filter(({ message }) => message.role !== 'system'),
    ]);
  }, []);

  return {
    messages,
    setMessages,
    clearSession,
    getSessions,
    resumeSession,
    replaceSeedMessages,
    session,
  };
};
