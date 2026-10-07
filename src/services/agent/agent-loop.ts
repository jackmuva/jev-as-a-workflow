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

const stopIfAborted = (
  signal: AbortSignal | undefined,
  state: AgentState,
  sync: (state: AgentState) => AgentState,
): boolean => {
  if (!signal?.aborted) return false;
  sync({
    state: "END",
    messages: [
      ...state.messages,
      jevMessage({ role: "assistant", content: "Run stopped." }),
    ],
  });
  return true;
};

export const jevLoop = async (
  messages: JevMessage[],
  callback: (messages: JevMessage[]) => void,
  options?: JevLoopOptions,
) => {
  const signal = options?.signal;
  const sync = (state: AgentState) => {
    callback(state.messages);
    return state;
  };

  let i = 0;
  let state: AgentState = { state: 'START', messages: [...messages] };

  if (findPendingAskQuestion(state.messages)) {
    return;
  }

  state = sync(await compactionHook(state));
  if (stopIfAborted(signal, state, sync)) return;

  state = sync(await initialNode(state));
  if (stopIfAborted(signal, state, sync)) return;

  state = sync(await compactionHook(state));
  if (stopIfAborted(signal, state, sync)) return;

  if (state.state === "END") {
    return;
  }
  if (state.state === "PLAN") {
    state = sync(await createPlanNode(state));
    if (stopIfAborted(signal, state, sync)) return;
  } else if (state.state === "DISCOVERY") {
    state = sync(await clarifyTaskNode(state));
    if (stopIfAborted(signal, state, sync)) return;
    if (findPendingAskQuestion(state.messages)) {
      return;
    }
  }

  let checkpoints: Array<{ state: AgentState, options: string[] }> = [];
  while (i < MAX_ITERATIONS) {
    if (stopIfAborted(signal, state, sync)) return;

    state = sync(await compactionHook(state));
    if (stopIfAborted(signal, state, sync)) return;

    if (state.state !== "REWIND" && !state.selectedTool) {
      const { state: newState, options } = await actionSelectNode(state);
      state = sync(newState);
      if (stopIfAborted(signal, state, sync)) return;
      if (options.length > 0) checkpoints.push({ state: { ...newState }, options });
    }
    if (state.state === "EXECUTE") {
      state = sync(await runToolNode(state));
      if (stopIfAborted(signal, state, sync)) return;
      if (state.state === "DISCOVERY" || findPendingAskQuestion(state.messages)) {
        return;
      }
      state = { ...state, selectedTool: undefined, probabilities: undefined };
      state = sync(await compactionHook(state));
      if (stopIfAborted(signal, state, sync)) return;
    }

    if (state.state === "END") {
      return;
    } else if (state.state === "REWIND") {
      const { state: rewoundState, checkpoints: rewoundCheckpoints } = rewindState(checkpoints, state);
      checkpoints = rewoundCheckpoints;
      state = sync(rewoundState);
      if (checkpoints.length === 0) {
        state = sync({
          state: "END",
          messages: [...state.messages, jevMessage({
            role: "assistant",
            content: "Unable to complete the task with given tools",
          })],
        });
        return;
      }
    }
    i += 1;
  }

  sync({
    state: "END",
    messages: [...state.messages, jevMessage({
      role: "assistant",
      content: "Unable to complete the task with given tools",
    })],
  });
}
