import type { ModelMessage } from 'ai';
import type { AgentState } from '../../models/agent';
import { evaluationNode, initialNode, createPlanNode } from './graph';

const MAX_ITERATIONS = 1;

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
    return;
  }

  //Do Work
  while (i < MAX_ITERATIONS) {
    await evaluationNode(state, callback);
    if (state.state === "END") break;
    i += 1;
  }
}
