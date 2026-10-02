import { Database } from 'bun:sqlite';
import type { ModelMessage } from 'ai';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DB_PATH, JEV_HOME } from '../constants';
import type { CapabilitySelection, JevMessage } from '../models/agent';

export type SessionRecord = {
  id: string;
  workspacePath: string;
  title: string | null;
  capabilities: CapabilitySelection | null;
  createdAt: number;
  updatedAt: number;
};

const initSchema = (db: Database) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      workspace_path TEXT NOT NULL,
      title TEXT,
      capabilities TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_sessions_workspace_updated
    ON sessions (workspace_path, updated_at DESC)
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      session_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      payload TEXT NOT NULL,
      PRIMARY KEY (session_id, position),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);
  db.run('PRAGMA journal_mode = WAL');
};

const createSessionId = () => crypto.randomUUID();

const parseCapabilities = (payload: string | null): CapabilitySelection | null => {
  if (!payload) return null;
  return JSON.parse(payload) as CapabilitySelection;
};

const rowToRecord = (row: {
  id: string;
  workspace_path: string;
  title: string | null;
  capabilities: string | null;
  created_at: number;
  updated_at: number;
}): SessionRecord => ({
  id: row.id,
  workspacePath: row.workspace_path,
  title: row.title,
  capabilities: parseCapabilities(row.capabilities),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Sessions saved before JevMessage stored bare ModelMessages.
const parseMessage = (payload: string): JevMessage => {
  const parsed = JSON.parse(payload) as JevMessage | ModelMessage;
  return 'message' in parsed ? parsed : { message: parsed };
};

const deriveTitle = (messages: JevMessage[]): string | null => {
  const firstUser = messages.find(({ message }) => message.role === 'user')?.message;
  if (!firstUser) return null;

  const text = typeof firstUser.content === 'string'
    ? firstUser.content
    : Array.isArray(firstUser.content)
      ? firstUser.content
        .map((part) => ('text' in part ? part.text : ''))
        .join('')
      : '';

  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
};

export class SessionStore {
  private readonly db: Database;

  private constructor(db: Database) {
    this.db = db;
    initSchema(db);
  }

  static open(path = DB_PATH): SessionStore {
    mkdirSync(JEV_HOME, { recursive: true });
    const db = new Database(path, { create: true });
    return new SessionStore(db);
  }

  static openInMemory(): SessionStore {
    const db = new Database(':memory:');
    return new SessionStore(db);
  }

  listSessions(workspacePath: string): SessionRecord[] {
    const normalized = resolve(workspacePath);
    const rows = this.db.query(`
      SELECT id, workspace_path, title, capabilities, created_at, updated_at
      FROM sessions
      WHERE workspace_path = ?
      ORDER BY updated_at DESC
    `).all(normalized) as Array<{
      id: string;
      workspace_path: string;
      title: string | null;
      capabilities: string | null;
      created_at: number;
      updated_at: number;
    }>;

    return rows.map(rowToRecord);
  }

  createSession(workspacePath: string): SessionRecord {
    const normalized = resolve(workspacePath);
    const now = Date.now();
    const session: SessionRecord = {
      id: createSessionId(),
      workspacePath: normalized,
      title: null,
      capabilities: null,
      createdAt: now,
      updatedAt: now,
    };

    this.db.run(`
      INSERT INTO sessions (id, workspace_path, title, capabilities, created_at, updated_at)
      VALUES (?, ?, NULL, NULL, ?, ?)
    `, [session.id, session.workspacePath, session.createdAt, session.updatedAt]);

    return session;
  }

  getOrCreateSession(workspacePath: string): SessionRecord {
    const normalized = resolve(workspacePath);
    const existing = this.db.query(`
      SELECT id, workspace_path, title, capabilities, created_at, updated_at
      FROM sessions
      WHERE workspace_path = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(normalized) as {
      id: string;
      workspace_path: string;
      title: string | null;
      capabilities: string | null;
      created_at: number;
      updated_at: number;
    } | null;

    if (existing) return rowToRecord(existing);

    return this.createSession(workspacePath);
  }

  loadMessages(sessionId: string): JevMessage[] {
    const rows = this.db.query(`
      SELECT payload
      FROM messages
      WHERE session_id = ?
      ORDER BY position ASC
    `).all(sessionId) as Array<{ payload: string }>;

    return rows.map((row) => parseMessage(row.payload));
  }

  getCapabilities(sessionId: string): CapabilitySelection | null {
    const row = this.db.query(`
      SELECT capabilities
      FROM sessions
      WHERE id = ?
    `).get(sessionId) as { capabilities: string | null } | null;

    return row ? parseCapabilities(row.capabilities) : null;
  }

  saveCapabilities(sessionId: string, capabilities: CapabilitySelection): void {
    this.db.run(`
      UPDATE sessions
      SET capabilities = ?, updated_at = ?
      WHERE id = ?
    `, [JSON.stringify(capabilities), Date.now(), sessionId]);
  }

  saveMessages(sessionId: string, messages: JevMessage[]): void {
    const conversation = messages.filter(({ message }) => message.role !== 'system');
    const title = deriveTitle(conversation);
    const now = Date.now();

    this.db.run('BEGIN IMMEDIATE');
    try {
      this.db.run('DELETE FROM messages WHERE session_id = ?', [sessionId]);
      const insert = this.db.prepare(`
        INSERT INTO messages (session_id, position, payload)
        VALUES (?, ?, ?)
      `);

      conversation.forEach((message, index) => {
        insert.run(sessionId, index, JSON.stringify(message));
      });

      this.db.run(`
        UPDATE sessions
        SET updated_at = ?, title = COALESCE(?, title)
        WHERE id = ?
      `, [now, title, sessionId]);

      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }
}
