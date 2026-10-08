import { findPendingAskQuestion } from './utils/ask-question-state';
import type { AgentState, JevMessage } from '../../models/agent';
import { clarifyTaskNode, createPlanNode, initialNode, runToolNode, actionSelectNode } from './graph';
import { compactionHook } from './hooks/compaction';
import { rewindState } from './hooks/rewind';
import { jevMessage } from './utils/jev-message';

const MAX_ITERATIONS = 50;

export type JevLoopOptions = {
  signal?: AbortSignal;
};

export const jevLoop = async (
  messages: JevMessage[],
  callback: (messages: JevMessage[]) => void,
  options?: JevLoopOptions,
) => {
  const signal = options?.signal;
  let state: AgentState = { state: 'START', messages: [...messages] };

  const sync = (next: AgentState) => {
    callback(next.messages);
    return next;
  };

  const stopIfAborted = (): boolean => {
    if (!signal?.aborted) return false;
    state = sync({
      state: 'END',
      messages: [
        ...state.messages,
        jevMessage({ role: 'assistant', content: 'Run stopped.' }),
      ],
    });
    return true;
  };

  const runNode = async (node: (state: AgentState) => Promise<AgentState>): Promise<boolean> => {
    state = sync(await compactionHook(state));
    if (stopIfAborted()) return false;

    try {
      state = sync(await node(state));
    } catch {
      if (stopIfAborted()) return false;
      state = sync(await compactionHook(state, true));
      if (stopIfAborted()) return false;
      state = sync(await node(state));
    }

    if (stopIfAborted()) return false;
    state = sync(await compactionHook(state));
    if (stopIfAborted()) return false;
    return true;
  };

  if (findPendingAskQuestion(state.messages)) return;
  if (!(await runNode(initialNode))) return;
  if (state.state === 'END') return;

  if (state.state === 'PLAN') {
    if (!(await runNode(createPlanNode))) return;
  } else if (state.state === 'DISCOVERY') {
    if (!(await runNode(clarifyTaskNode))) return;
    if (findPendingAskQuestion(state.messages)) return;
  }

  let checkpoints: Array<{ state: AgentState; options: string[] }> = [];
  let i = 0;
  while (i < MAX_ITERATIONS) {
    if (stopIfAborted()) return;

    if (state.state !== 'REWIND' && !state.selectedTool) {
      let actionSelectCheckpoint: { state: AgentState; options: string[] } | null = null;
      if (!(await runNode(async (s) => {
        const { state: newState, options } = await actionSelectNode(s);
        if (options.length > 0 && newState.state === 'EXECUTE') {
          actionSelectCheckpoint = { state: { ...newState }, options };
        }
        return newState;
      }))) return;
      if (actionSelectCheckpoint) checkpoints.push(actionSelectCheckpoint);
    }

    const runningTool = state.state === 'EXECUTE';
    if (runningTool && !(await runNode(runToolNode))) return;
    if (runningTool) {
      if (state.state === 'DISCOVERY' || findPendingAskQuestion(state.messages)) return;
      state = sync({ ...state, selectedTool: undefined, probabilities: undefined });
    }

    if (state.state === 'END') {
      return;
    }
    if (state.state === 'REWIND') {
      const { state: rewoundState, checkpoints: rewoundCheckpoints } = rewindState(checkpoints, state);
      checkpoints = rewoundCheckpoints;
      state = sync(rewoundState);
      if (checkpoints.length === 0) {
        state = sync({
          state: 'END',
          messages: [...state.messages, jevMessage({
            role: 'assistant',
            content: 'Unable to complete the task with given tools',
          })],
        });
        return;
      }
    }
    i += 1;
  }

  sync({
    state: 'END',
    messages: [...state.messages, jevMessage({
      role: 'assistant',
      content: 'Unable to complete the task with given tools',
    })],
  });
};
