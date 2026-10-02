import { describe, expect, test } from 'bun:test';
import type { WorkflowRecord } from '../../models/workflow';
import { buildWorkflowUserMessage } from './build-message';

const sampleWorkflow: WorkflowRecord = {
  id: 'wf-1',
  workspacePath: '/tmp/project',
  sourceSessionId: null,
  title: 'Add persistence',
  goal: 'Add SQLite-backed workflow storage',
  createdAt: 1,
  updatedAt: 1,
  steps: [
    {
      intent: 'Find session store',
      action: 'Search for SessionStore usage',
      toolParameters: { pattern: 'SessionStore' },
    },
    {
      intent: 'Run lint',
      action: 'Verify types with the linter',
    },
  ],
};

describe('buildWorkflowUserMessage', () => {
  test('includes goal, steps, and additional instructions', () => {
    const message = buildWorkflowUserMessage(sampleWorkflow, 'Use the main branch');

    expect(message.role).toBe('user');
    expect(typeof message.content).toBe('string');
    const content = message.content as string;

    expect(content).toContain('Add SQLite-backed workflow storage');
    expect(content).toContain('Search for SessionStore usage');
    expect(content).toContain('"pattern":"SessionStore"');
    expect(content).toContain('Verify types with the linter');
    expect(content).toContain('Use the main branch');
  });

  test('omits additional instructions section when empty', () => {
    const message = buildWorkflowUserMessage(sampleWorkflow, '   ');
    const content = message.content as string;

    expect(content).not.toContain('## Additional instructions');
  });
});
