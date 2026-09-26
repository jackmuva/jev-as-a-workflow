import type { AgentState } from "../../../models/agent";

export const rewindState = (checkpoints: Array<{ state: AgentState, options: string[] }>, state: AgentState) => {
  let newState = { ...state };
  let newCheckpoints = [...checkpoints];
  while (newCheckpoints.length > 0) {
    let lastCheckpoint = newCheckpoints.at(-1);
    if (lastCheckpoint!.options.length > 0) {
      lastCheckpoint!.options.shift();
      newState = {
        ...lastCheckpoint!.state,
        selectedTool: lastCheckpoint!.options[0],
        state: 'REWIND',
      };
      return { state: newState, checkpoints: newCheckpoints }
    } else {
      checkpoints.pop();
    }
  }
  return { state: newState, checkpoints: newCheckpoints }
}
