import { findPendingAskQuestion } from './utils/ask-question-state';
import type { AgentState, JevMessage } from '../../models/agent';
import { clarifyTaskNode, createPlanNode, initialNode, runToolNode, actionSelectNode } from './graph';
import { compactionHook } from './hooks/compaction';
import { rewindState } from './hooks/rewind';
import { jevMessage } from './utils/jev-message';

const MAX_ITERATIONS = 50;

export const jevLoop = async (
  messages: JevMessage[],
  callback: (messages: JevMessage[]) => void,
) => {
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
  state = sync(await initialNode(state));
  state = sync(await compactionHook(state));
  if (state.state === "PLAN") {
    state = sync(await createPlanNode(state));
  } else if (state.state === "DISCOVERY") {
    state = sync(await clarifyTaskNode(state));
    if (findPendingAskQuestion(state.messages)) {
      return;
    }
  }

  let checkpoints: Array<{ state: AgentState, options: string[] }> = [];
  while (i < MAX_ITERATIONS) {
    state = sync(await compactionHook(state));
    if (state.state !== "REWIND" && !state.selectedTool) {
      const { state: newState, options } = await actionSelectNode(state);
      state = sync(newState);
      if (options.length > 0) checkpoints.push({ state: { ...newState }, options });
    }
    if (state.state === "EXECUTE") {
      state = sync(await runToolNode(state));
      state = { ...state, selectedTool: undefined, probabilities: undefined };
      state = sync(await compactionHook(state));
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
