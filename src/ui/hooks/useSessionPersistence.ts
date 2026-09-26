import type { ModelMessage } from 'ai';
import { resolve } from 'node:path';
import { useCallback, useMemo, useRef, useState } from 'react';
import { SessionStore, type SessionRecord } from '../../services/session/store';

type SetMessagesAction = ModelMessage[] | ((previous: ModelMessage[]) => ModelMessage[]);

export type UseSessionPersistenceResult = {
  messages: ModelMessage[];
  setMessages: (update: SetMessagesAction) => void;
  session: SessionRecord;
};

export const useSessionPersistence = (
  seedMessages: ModelMessage[],
  workspacePath = process.cwd(),
): UseSessionPersistenceResult => {
  const store = useMemo(() => SessionStore.open(), []);
  const workspace = useMemo(() => resolve(workspacePath), [workspacePath]);
  const sessionRef = useRef<SessionRecord | null>(null);

  if (!sessionRef.current) {
    sessionRef.current = store.getOrCreateSession(workspace);
  }

  const session = sessionRef.current;

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

  return { messages, setMessages, session };
};
