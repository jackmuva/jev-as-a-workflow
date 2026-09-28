import { Database } from 'bun:sqlite';
import type { ModelMessage } from 'ai';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { join } from 'node:path';
import { JEV_HOME } from '../../constants';

const SESSION_DB_PATH = join(JEV_HOME, 'sessions.db');

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

const deriveTitle = (messages: ModelMessage[]): string | null => {
  const firstUser = messages.find((message) => message.role === 'user');
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

  static open(path = SESSION_DB_PATH): SessionStore {
    mkdirSync(JEV_HOME, { recursive: true });
    const db = new Database(path, { create: true });
    return new SessionStore(db);
  }

  static openInMemory(): SessionStore {
    const db = new Database(':memory:');
    return new SessionStore(db);
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

  loadMessages(sessionId: string): ModelMessage[] {
    const rows = this.db.query(`
      SELECT payload
      FROM messages
      WHERE session_id = ?
      ORDER BY position ASC
    `).all(sessionId) as Array<{ payload: string }>;

    return rows.map((row) => JSON.parse(row.payload) as ModelMessage);
  }

  saveMessages(sessionId: string, messages: ModelMessage[]): void {
    const conversation = messages.filter((message) => message.role !== 'system');
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
