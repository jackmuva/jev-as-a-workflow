import { describe, expect, test } from 'bun:test';
import { emptyCapabilitySelection } from '../services/agent/capabilities';
import { WorkflowStore } from './workflow-store';

const sampleCapabilities = () => {
  const capabilities = emptyCapabilitySelection();
  capabilities.mcpServers = ['github'];
  return capabilities;
};

describe('WorkflowStore', () => {
  test('saves and lists workflows for a workspace', () => {
    const store = WorkflowStore.openInMemory();
    const workspace = '/tmp/project-workflows';

    const saved = store.saveWorkflow({
      workspacePath: workspace,
      sourceSessionId: 'session-1',
      title: 'Add persistence',
      goal: 'Add SQLite-backed workflow storage',
      requiredCapabilities: sampleCapabilities(),
      steps: [
        {
          intent: 'Find session store',
          action: 'Search for SessionStore usage',
          toolParameters: { pattern: 'SessionStore' },
        },
      ],
    });

    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeGreaterThan(0);

    const workflows = store.listWorkflows(workspace);
    expect(workflows).toHaveLength(1);
    expect(workflows[0]?.title).toBe('Add persistence');
    expect(workflows[0]?.steps[0]?.toolParameters).toEqual({ pattern: 'SessionStore' });
    expect(workflows[0]?.requiredCapabilities.mcpServers).toEqual(['github']);
  });

  test('gets a workflow by id', () => {
    const store = WorkflowStore.openInMemory();
    const saved = store.saveWorkflow({
      workspacePath: '/tmp/project-get',
      title: 'Test workflow',
      goal: 'Verify retrieval',
      requiredCapabilities: emptyCapabilitySelection(),
      steps: [{ intent: 'Run tests', action: 'Execute bun test' }],
    });

    const loaded = store.getWorkflow(saved.id);
    expect(loaded?.goal).toBe('Verify retrieval');
    expect(store.getWorkflow('missing')).toBeNull();
  });

  test('orders workflows by most recently updated', async () => {
    const store = WorkflowStore.openInMemory();
    const workspace = '/tmp/project-order';

    const first = store.saveWorkflow({
      workspacePath: workspace,
      title: 'First',
      goal: 'First goal',
      requiredCapabilities: emptyCapabilitySelection(),
      steps: [{ intent: 'One', action: 'Do one thing' }],
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    const second = store.saveWorkflow({
      workspacePath: workspace,
      title: 'Second',
      goal: 'Second goal',
      requiredCapabilities: emptyCapabilitySelection(),
      steps: [{ intent: 'Two', action: 'Do two things' }],
    });

    const workflows = store.listWorkflows(workspace);
    expect(workflows[0]?.id).toBe(second.id);
    expect(workflows[1]?.id).toBe(first.id);
  });
});
