import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { join } from 'node:path';
import { JEV_HOME } from '../../constants';
import type { WorkflowRecord, WorkflowStep } from '../../models/workflow';

const WORKFLOW_DB_PATH = join(JEV_HOME, 'sessions.db');

const initWorkflowSchema = (db: Database) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      workspace_path TEXT NOT NULL,
      source_session_id TEXT,
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      steps TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (source_session_id) REFERENCES sessions(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_workflows_workspace_updated
    ON workflows (workspace_path, updated_at DESC)
  `);
  db.run('PRAGMA journal_mode = WAL');
};

const createWorkflowId = () => crypto.randomUUID();

const parseSteps = (payload: string): WorkflowStep[] => {
  const parsed = JSON.parse(payload) as WorkflowStep[];
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid workflow steps payload');
  }
  return parsed;
};

const rowToRecord = (row: {
  id: string;
  workspace_path: string;
  source_session_id: string | null;
  title: string;
  goal: string;
  steps: string;
  created_at: number;
  updated_at: number;
}): WorkflowRecord => ({
  id: row.id,
  workspacePath: row.workspace_path,
  sourceSessionId: row.source_session_id,
  title: row.title,
  goal: row.goal,
  steps: parseSteps(row.steps),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class WorkflowStore {
  private readonly db: Database;

  private constructor(db: Database) {
    this.db = db;
    initWorkflowSchema(db);
  }

  static open(path = WORKFLOW_DB_PATH): WorkflowStore {
    mkdirSync(JEV_HOME, { recursive: true });
    const db = new Database(path, { create: true });
    return new WorkflowStore(db);
  }

  static openInMemory(): WorkflowStore {
    const db = new Database(':memory:');
    return new WorkflowStore(db);
  }

  listWorkflows(workspacePath: string): WorkflowRecord[] {
    const normalized = resolve(workspacePath);
    const rows = this.db.query(`
      SELECT id, workspace_path, source_session_id, title, goal, steps, created_at, updated_at
      FROM workflows
      WHERE workspace_path = ?
      ORDER BY updated_at DESC
    `).all(normalized) as Array<{
      id: string;
      workspace_path: string;
      source_session_id: string | null;
      title: string;
      goal: string;
      steps: string;
      created_at: number;
      updated_at: number;
    }>;

    return rows.map(rowToRecord);
  }

  getWorkflow(id: string): WorkflowRecord | null {
    const row = this.db.query(`
      SELECT id, workspace_path, source_session_id, title, goal, steps, created_at, updated_at
      FROM workflows
      WHERE id = ?
    `).get(id) as {
      id: string;
      workspace_path: string;
      source_session_id: string | null;
      title: string;
      goal: string;
      steps: string;
      created_at: number;
      updated_at: number;
    } | null;

    return row ? rowToRecord(row) : null;
  }

  saveWorkflow(input: {
    workspacePath: string;
    sourceSessionId?: string | null;
    title: string;
    goal: string;
    steps: WorkflowStep[];
  }): WorkflowRecord {
    const normalized = resolve(input.workspacePath);
    const now = Date.now();
    const workflow: WorkflowRecord = {
      id: createWorkflowId(),
      workspacePath: normalized,
      sourceSessionId: input.sourceSessionId ?? null,
      title: input.title.trim(),
      goal: input.goal.trim(),
      steps: input.steps,
      createdAt: now,
      updatedAt: now,
    };

    this.db.run(`
      INSERT INTO workflows (
        id, workspace_path, source_session_id, title, goal, steps, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      workflow.id,
      workflow.workspacePath,
      workflow.sourceSessionId,
      workflow.title,
      workflow.goal,
      JSON.stringify(workflow.steps),
      workflow.createdAt,
      workflow.updatedAt,
    ]);

    return workflow;
  }
}
