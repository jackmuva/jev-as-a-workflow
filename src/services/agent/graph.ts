import { experimental_evaluate as evaluate, generateText, type JSONValue, type ModelMessage } from 'ai';
import type { AgentState } from '../../models/agent';
import { mcpClient } from '../mcp/mcp-client';

const COMPLETION_THRESHOLD = 0.75;

const tools = await mcpClient.listTools();
const toolList = tools
  .map((tool) => `- ${tool.server}/${tool.name}${tool.description ? `: ${tool.description}` : ''}`)
  .join('\n');

export const evaluationNode = async (state: AgentState, callback: (message: ModelMessage) => void): Promise<AgentState> => {
  const { answers: completed } = await evaluate({
    model: 'typesafe-ai/jev',
    state: [state.messages as JSONValue],
    questions: {
      taskCompleted: {
        type: 'boolean',
        instructions: 'Is the task in the user\'s last message complete?',
      },
    },
  });

  let message: ModelMessage = {
    role: "assistant",
    content: "Unable to complete task with given iterations"
  }
  if (completed.taskCompleted.probability > COMPLETION_THRESHOLD) {
    message = {
      role: "assistant",
      content: "Task Complete"
    };
  }
  callback(message);
  return { state: "END", messages: [...state.messages, message] };
}

export const initialNode = async (state: AgentState, callback: (message: ModelMessage) => void): Promise<AgentState> => {
  const { answers } = await evaluate({
    model: 'typesafe-ai/jev',
    state: [{
      toolsAvailable: tools as JSONValue,
      messages: state.messages as JSONValue
    }],
    questions: {
      nextStep: {
        type: "choice",
        instructions: "Based off the user's last ask and the tools given, what should we do?",
        criteria: {
          "directAnswer": "The user's task can be solved with a single tool call",
          "createPlan": "The user's task is a multi-step problem. We should create a plan.",
          "clarifyTask": "The task is too ambiguous. We should ask followup questions.",
          "outOfScope": "The task is outside of the capabilities given the tools"
        }
      }
    },
  });

  if(answers.nextStep.choice === "outOfScope"){
    const message: ModelMessage = {
      role: 'assistant',
      content: "task out of scope"
    };
    callback(message)
    return { state: "END", messages: [...state.messages, message] };
  } else if (answers.nextStep.choice === "createPlan") {
    return { state: "PLAN", messages: state.messages };
  } else if( answers.nextStep.choice === "directAnswer"){
    return { state: "EXECUTE", messages: state.messages };
  }else{
    return { state: "DISCOVERY", messages: state.messages };
  }
}

export const createPlanNode = async (state: AgentState, callback: (message: ModelMessage) => void,
): Promise<AgentState> => {
  const { text } = await generateText({
    model: 'deepseek/deepseek-v4.1-flash',
    instructions: `You are a planner. Break the user's task into a short numbered list of steps. \n\nWe have the following tools to complete the task:\n${toolList || '(none)'} \n\nRespond with the plan only.`,
    messages: state.messages,
  });

  const message: ModelMessage = { role: 'assistant', content: text }
  callback(message);

  return {
    state: "EXECUTE",
    messages: [...state.messages, message],
  };
}
