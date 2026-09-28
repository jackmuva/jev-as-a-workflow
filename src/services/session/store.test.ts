import { describe, expect, test } from 'bun:test';
import type { ModelMessage } from 'ai';
import { SessionStore } from './store';

describe('SessionStore', () => {
  test('creates and resumes a workspace session', () => {
    const store = SessionStore.openInMemory();
    const first = store.getOrCreateSession('/tmp/project-a');
    const second = store.getOrCreateSession('/tmp/project-a');

    expect(second.id).toBe(first.id);
  });

  test('persists non-system messages in order', () => {
    const store = SessionStore.openInMemory();
    const session = store.getOrCreateSession('/tmp/project-b');
    const seed: ModelMessage[] = [{ role: 'system', content: 'rules' }];
    const conversation: ModelMessage[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
    ];

    store.saveMessages(session.id, [...seed, ...conversation]);
    const loaded = store.loadMessages(session.id);

    expect(loaded).toEqual(conversation);
  });

  test('replaces messages on save', () => {
    const store = SessionStore.openInMemory();
    const session = store.getOrCreateSession('/tmp/project-c');

    store.saveMessages(session.id, [{ role: 'user', content: 'first' }]);
    store.saveMessages(session.id, [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'second' },
    ]);

    expect(store.loadMessages(session.id)).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'second' },
    ]);
  });

  test('clears saved messages when only system messages remain', () => {
    const store = SessionStore.openInMemory();
    const session = store.getOrCreateSession('/tmp/project-d');
    const seed: ModelMessage[] = [{ role: 'system', content: 'rules' }];

    store.saveMessages(session.id, [
      ...seed,
      { role: 'user', content: 'hello' },
    ]);
    store.saveMessages(session.id, seed);

    expect(store.loadMessages(session.id)).toEqual([]);
  });
});
