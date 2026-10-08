import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { DB_PATH, JEV_HOME } from '../constants';
import type { CapabilitySelection } from '../models/agent';
import type { WorkflowRecord, WorkflowStep } from '../models/workflow';

const initWorkflowSchema = (db: Database) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      source_session_id TEXT,
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      steps TEXT NOT NULL,
      required_capabilities TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (source_session_id) REFERENCES sessions(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_workflows_updated
    ON workflows (updated_at DESC)
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

const parseCapabilities = (payload: string): CapabilitySelection =>
  JSON.parse(payload) as CapabilitySelection;

const rowToRecord = (row: {
  id: string;
  source_session_id: string | null;
  title: string;
  goal: string;
  steps: string;
  required_capabilities: string;
  created_at: number;
  updated_at: number;
}): WorkflowRecord => ({
  id: row.id,
  sourceSessionId: row.source_session_id,
  title: row.title,
  goal: row.goal,
  steps: parseSteps(row.steps),
  requiredCapabilities: parseCapabilities(row.required_capabilities),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class WorkflowStore {
  private readonly db: Database;

  private constructor(db: Database) {
    this.db = db;
    initWorkflowSchema(db);
  }

  static open(path = DB_PATH): WorkflowStore {
    mkdirSync(JEV_HOME, { recursive: true });
    const db = new Database(path, { create: true });
    return new WorkflowStore(db);
  }

  static openInMemory(): WorkflowStore {
    const db = new Database(':memory:');
    return new WorkflowStore(db);
  }

  listWorkflows(): WorkflowRecord[] {
    const rows = this.db.query(`
      SELECT id, source_session_id, title, goal, steps, required_capabilities, created_at, updated_at
      FROM workflows
      ORDER BY updated_at DESC
    `).all() as Array<{
      id: string;
      source_session_id: string | null;
      title: string;
      goal: string;
      steps: string;
      required_capabilities: string;
      created_at: number;
      updated_at: number;
    }>;

    return rows.map(rowToRecord);
  }

  getWorkflow(id: string): WorkflowRecord | null {
    const row = this.db.query(`
      SELECT id, source_session_id, title, goal, steps, required_capabilities, created_at, updated_at
      FROM workflows
      WHERE id = ?
    `).get(id) as {
      id: string;
      source_session_id: string | null;
      title: string;
      goal: string;
      steps: string;
      required_capabilities: string;
      created_at: number;
      updated_at: number;
    } | null;

    return row ? rowToRecord(row) : null;
  }

  saveWorkflow(input: {
    sourceSessionId?: string | null;
    title: string;
    goal: string;
    steps: WorkflowStep[];
    requiredCapabilities: CapabilitySelection;
  }): WorkflowRecord {
    const now = Date.now();
    const workflow: WorkflowRecord = {
      id: createWorkflowId(),
      sourceSessionId: input.sourceSessionId ?? null,
      title: input.title.trim(),
      goal: input.goal.trim(),
      steps: input.steps,
      requiredCapabilities: input.requiredCapabilities,
      createdAt: now,
      updatedAt: now,
    };

    this.db.run(`
      INSERT INTO workflows (
        id, source_session_id, title, goal, steps, required_capabilities, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      workflow.id,
      workflow.sourceSessionId,
      workflow.title,
      workflow.goal,
      JSON.stringify(workflow.steps),
      JSON.stringify(workflow.requiredCapabilities),
      workflow.createdAt,
      workflow.updatedAt,
    ]);

    return workflow;
  }
}
