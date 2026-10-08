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

const sync = (next: AgentState, callback: (messages: JevMessage[]) => void): AgentState => {
  callback(next.messages);
  return next;
};

const stopIfAborted = (state: AgentState, callback: (messages: JevMessage[]) => void, signal?: AbortSignal,): AgentState | undefined => {
  if (!signal?.aborted) return undefined;
  return sync({
    state: 'END',
    messages: [
      ...state.messages,
      jevMessage({ role: 'assistant', content: 'Run stopped.' }),
    ],
  }, callback);
};

const runNode = async (state: AgentState, node: (state: AgentState) => Promise<AgentState>, callback: (messages: JevMessage[]) => void, signal?: AbortSignal,): Promise<{ ok: boolean; state: AgentState }> => {
  let current = sync(await compactionHook(state), callback);
  let ended = stopIfAborted(current, callback, signal);
  if (ended) return { ok: false, state: ended };

  try {
    current = sync(await node(current), callback);
  } catch {
    current = sync(await compactionHook(current, true), callback);
    current = sync(await node(current), callback);
  }

  ended = stopIfAborted(current, callback, signal);
  if (ended) return { ok: false, state: ended };
  current = sync(await compactionHook(current), callback);
  ended = stopIfAborted(current, callback, signal);
  if (ended) return { ok: false, state: ended };
  return { ok: true, state: current };
};

export const jevLoop = async (
  messages: JevMessage[],
  callback: (messages: JevMessage[]) => void,
  options?: JevLoopOptions,
) => {
  const signal = options?.signal;
  let state: AgentState = { state: 'START', messages: [...messages] };

  if (findPendingAskQuestion(state.messages)) return;

  let result = await runNode(state, initialNode, callback, signal);
  state = result.state;
  if (!result.ok) return;
  if (state.state === 'END') return;

  if (state.state === 'PLAN') {
    result = await runNode(state, createPlanNode, callback, signal);
    state = result.state;
    if (!result.ok) return;
  } else if (state.state === 'DISCOVERY') {
    result = await runNode(state, clarifyTaskNode, callback, signal);
    state = result.state;
    if (!result.ok) return;
    if (findPendingAskQuestion(state.messages)) return;
  }

  let checkpoints: Array<{ state: AgentState; options: string[] }> = [];
  let i = 0;
  while (i < MAX_ITERATIONS) {
    const loopEnded = stopIfAborted(state, callback, signal);
    if (loopEnded) {
      state = loopEnded;
      return;
    }

    if (state.state !== 'REWIND' && !state.selectedTool) {
      let actionSelectCheckpoint: { state: AgentState; options: string[] } | null = null;
      result = await runNode(state, async (s) => {
        const { state: newState, options } = await actionSelectNode(s);
        if (options.length > 0 && newState.state === 'EXECUTE') {
          actionSelectCheckpoint = { state: { ...newState }, options };
        }
        return newState;
      }, callback, signal);
      state = result.state;
      if (!result.ok) return;
      if (actionSelectCheckpoint) checkpoints.push(actionSelectCheckpoint);
    }

    const runningTool = state.state === 'EXECUTE';
    if (runningTool) {
      result = await runNode(state, runToolNode, callback, signal);
      state = result.state;
      if (!result.ok) return;
    }
    if (runningTool) {
      if (state.state === 'DISCOVERY' || findPendingAskQuestion(state.messages)) return;
      state = sync({ ...state, selectedTool: undefined, probabilities: undefined }, callback);
    }

    if (state.state === 'END') {
      return;
    }
    if (state.state === 'REWIND') {
      const { state: rewoundState, checkpoints: rewoundCheckpoints } = rewindState(checkpoints, state);
      checkpoints = rewoundCheckpoints;
      state = sync(rewoundState, callback);
      if (checkpoints.length === 0) {
        state = sync({
          state: 'END',
          messages: [...state.messages, jevMessage({
            role: 'assistant',
            content: 'Unable to complete the task with given tools',
          })],
        }, callback);
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
  }, callback);
};
