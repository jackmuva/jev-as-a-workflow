import type { ModelMessage } from 'ai';
import type { AgentState } from '../../models/agent';
import { clarifyTaskNode, createPlanNode, evaluationNode, initialNode, runToolNode, toolSelectNode } from './graph';
import { compactionHook } from './hooks/compaction';
import { rewindState } from './hooks/rewind';

const MAX_ITERATIONS = 50;

export const jevLoop = async (
  messages: ModelMessage[],
  callback: (message: ModelMessage) => void,
) => {
  let i = 0;
  let state: AgentState = { state: 'START', messages: [...messages] };
  //
  //Initial scoping
  state = await initialNode(state, callback);
  if (state.state === "PLAN") {
    state = await createPlanNode(state, callback);
  } else if (state.state === "DISCOVERY") {
    state = await clarifyTaskNode(state, callback);
    return;
  }

  //Do Work
  let checkpoints: Array<{ state: AgentState, options: string[] }> = [];
  while (i < MAX_ITERATIONS) {
    if (state.state !== "REWIND") {
      const { state: newState, options } = await toolSelectNode(state, callback);
      state = newState;
      if (options.length > 0) checkpoints.push({ state: { ...newState }, options });
    }
    if (state.state === "EXECUTE" || state.state === "REWIND") {
      state = await runToolNode(state, callback);
      state = await compactionHook(state);
    }

    state = await evaluationNode(state, callback);

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
