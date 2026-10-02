import { Database } from 'bun:sqlite';
import type { ModelMessage } from 'ai';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DB_PATH, JEV_HOME } from '../constants';
import type { JevMessage } from '../models/agent';

export type SessionRecord = {
  id: string;
  workspacePath: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
};

const initSchema = (db: Database) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      workspace_path TEXT NOT NULL,
      title TEXT,
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
      SELECT id, workspace_path, title, created_at, updated_at
      FROM sessions
      WHERE workspace_path = ?
      ORDER BY updated_at DESC
    `).all(normalized) as Array<{
      id: string;
      workspace_path: string;
      title: string | null;
      created_at: number;
      updated_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      workspacePath: row.workspace_path,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  createSession(workspacePath: string): SessionRecord {
    const normalized = resolve(workspacePath);
    const now = Date.now();
    const session: SessionRecord = {
      id: createSessionId(),
      workspacePath: normalized,
      title: null,
      createdAt: now,
      updatedAt: now,
    };

    this.db.run(`
      INSERT INTO sessions (id, workspace_path, title, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?)
    `, [session.id, session.workspacePath, session.createdAt, session.updatedAt]);

    return session;
  }

  getOrCreateSession(workspacePath: string): SessionRecord {
    const normalized = resolve(workspacePath);
    const existing = this.db.query(`
      SELECT id, workspace_path, title, created_at, updated_at
      FROM sessions
      WHERE workspace_path = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(normalized) as {
      id: string;
      workspace_path: string;
      title: string | null;
      created_at: number;
      updated_at: number;
    } | null;

    if (existing) {
      return {
        id: existing.id,
        workspacePath: existing.workspace_path,
        title: existing.title,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

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
