export type WorkflowStep = {
  intent: string;
  action: string;
  toolParameters?: Record<string, string>;
};

export type WorkflowRecord = {
  id: string;
  workspacePath: string;
  sourceSessionId: string | null;
  title: string;
  goal: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
};

export type GeneratedWorkflow = Pick<WorkflowRecord, 'title' | 'goal' | 'steps'>;
