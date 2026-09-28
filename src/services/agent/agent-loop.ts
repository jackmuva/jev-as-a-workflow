import type { ModelMessage } from 'ai';
import { findPendingAskQuestion } from './utils/ask-question-state';
import type { AgentState } from '../../models/agent';
import { clarifyTaskNode, createPlanNode, initialNode, toolNode } from './graph';
import { rewindState } from './hooks/rewind';

const MAX_ITERATIONS = 50;

export const jevLoop = async (
  messages: ModelMessage[],
  callback: (message: ModelMessage) => void,
) => {
  let i = 0;
  let state: AgentState = { state: 'START', messages: [...messages] };

  if (findPendingAskQuestion(state.messages)) {
    return;
  }

  state = await initialNode(state, callback);
  if (state.state === "PLAN") {
    state = await createPlanNode(state, callback);
  } else if (state.state === "DISCOVERY") {
    state = await clarifyTaskNode(state, callback);
    if (findPendingAskQuestion(state.messages)) {
      return;
    }
  }

  let checkpoints: Array<{ state: AgentState, options: string[] }> = [];
  while (i < MAX_ITERATIONS) {
    const { state: newState, checkpoint } = await toolNode(state, callback);
    state = newState;
    if (checkpoint) {
      checkpoints.push(checkpoint);
    }

    if (state.state === "END") {
      return;
    } else if (state.state === "REWIND") {
      const { state: rewoundState, checkpoints: rewoundCheckpoints } = rewindState(checkpoints, state);
      checkpoints = rewoundCheckpoints;
      state = rewoundState;
      if (checkpoints.length === 0) {
        const message: ModelMessage = {
          role: "assistant",
          content: "Unable to complete the task with given tools"
        }
        callback(message);
        return { state: "END", messages: [...state.messages, message] };
      }
    }
    i += 1;
  }
}
