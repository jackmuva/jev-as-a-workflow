import {
  experimental_evaluate as evaluate,
  generateText,
  jsonSchema,
  tool,
  ToolChoiceViolationError,
  type JSONValue,
  type ModelMessage,
  type ToolChoice,
} from 'ai';
import { LLM_MODEL, SYSTEM_ONE_MODEL } from '../../constants';
import type { AgentState } from '../../models/agent';
import type { McpTool } from '../../models/mcp';
import { mcpClient } from '../mcp/mcp-client';
import { askQuestionTool, type AskQuestionInput } from './default-tools/ask-question';
import {
  defaultToolKey,
  executeDefaultTool,
  isDefaultToolKey,
  listDefaultTools,
} from './default-tools';
import { preparePrompt } from './prompt';
import { executeUserTool, isUserToolKey, listUserTools, loadUserTools } from './user-tools/loader';

const toolKey = (tool: McpTool) => `${tool.server}/${tool.name}`;

const parseToolKey = (key: string): { server: string, name: string } => {
  const slash = key.indexOf('/');
  return { server: key.slice(0, slash), name: key.slice(slash + 1) };
};

const toolInvocationName = (toolKeyValue: string, server: string, name: string) => isDefaultToolKey(toolKeyValue) || isUserToolKey(toolKeyValue) ? name : `${server}_${name}`;

const generateRequiredToolCall = async ({
  instructions,
  messages,
  tools,
  toolName,
  maxAttempts = 3,
}: {
  instructions: string;
  messages: ModelMessage[];
  tools: Record<string, any>;
  toolName: string;
  maxAttempts?: number;
}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const toolChoice: ToolChoice<typeof tools> = attempt < maxAttempts - 1
      ? { type: 'tool', toolName: toolName as Extract<keyof typeof tools, string> }
      : 'required';

    try {
      const prompt = preparePrompt(instructions, messages);
      const result = await generateText({
        model: LLM_MODEL,
        instructions: prompt.instructions,
        messages: prompt.messages,
        tools,
        toolChoice,
      });

      const toolCall = result.toolCalls.find(
        (call) => toolChoice === 'required' || call.toolName === toolName,
      );
      if (toolCall) return toolCall;
    } catch (error) {
      if (!ToolChoiceViolationError.isInstance(error)) throw error;
    }
  }

  return undefined;
};

const buildToolCriteria = (tools: McpTool[]) => {
  let criteria: {
    [action: string]: {
      description: string,
      inputSchema?: JSONValue
    }
  } = Object.fromEntries(tools.map((t) => [toolKey(t), {
    description: t.description ?? 'No description provided',
    inputSchema: t.inputSchema as JSONValue,
  }]));

  criteria = {
    ...criteria,
    taskCompleted: {
      description: "The user's task was completed"
    },
    wrongPath: {
      description: "Based off the given tools, we took the wrong steps. Rewind to the last message"
    },
    notPossible: {
      description: "Based off the given tools, the task is not possible"
    },
  }
  return criteria;
}

await loadUserTools();

const listAllTools = async () => [
  ...listDefaultTools(),
  ...listUserTools(),
  ...(await mcpClient.listTools()),
];

const tools = await listAllTools();
const toolList = tools
  .map((tool) => `- ${tool.server}/${tool.name}${tool.description ? `: ${tool.description}` : ''}`)
  .join('\n');

export const initialNode = async (state: AgentState): Promise<AgentState> => {
  const { answers } = await evaluate({
    model: SYSTEM_ONE_MODEL,
    state: [{
      toolsAvailable: tools as JSONValue,
      messages: state.messages as JSONValue
    }],
    questions: {
      nextStep: {
        type: "choice",
        instructions: "Based off the user's last ask and the tools given, what should we do?",
        criteria: {
          "answerQuestion": "The user is asking an informational question for the LLM to answer. Use message_answer.",
          "directAnswer": "The user wants a command or action performed with a single tool call (not message_answer).",
          "createPlan": "The user's task is a multi-step problem. We should create a plan.",
          "clarifyTask": "The task is too ambiguous. We should ask followup questions.",
          "outOfScope": "The task is outside of the capabilities given the tools"
        }
      }
    },
  });

  if (answers.nextStep.choice === "outOfScope") {
    const message: ModelMessage = {
      role: 'assistant',
      content: "task out of scope"
    };
    return { state: "END", messages: [...state.messages, message] };
  } else if (answers.nextStep.choice === "createPlan") {
    return { state: "PLAN", messages: state.messages };
  } else if (answers.nextStep.choice === "answerQuestion") {
    return {
      state: "EXECUTE",
      messages: state.messages,
      selectedTool: defaultToolKey('message_answer'),
    };
  } else if (answers.nextStep.choice === "directAnswer") {
    return { state: "EXECUTE", messages: state.messages };
  } else {
    return { state: "DISCOVERY", messages: state.messages };
  }
}

export const createPlanNode = async (state: AgentState): Promise<AgentState> => {
  const planPrompt = preparePrompt(
    `You are a planner. Break the user's task into a short numbered list of steps. \n\nWe have the following tools to complete the task:\n${toolList || '(none)'} \n\nRespond with the plan only.`,
    state.messages,
  );
  const { text } = await generateText({
    model: LLM_MODEL,
    instructions: planPrompt.instructions,
    messages: planPrompt.messages,
  });

  const message: ModelMessage = { role: 'assistant', content: text }

  return {
    state: "EXECUTE",
    messages: [...state.messages, message],
  };
}

export const clarifyTaskNode = async (state: AgentState): Promise<AgentState> => {
  const toolCall = await generateRequiredToolCall({
    instructions: `You are helping clarify an ambiguous user task before work begins. Ask 1-3 focused follow-up questions to resolve what is unclear.


Call the AskQuestion tool with concrete options for each question. Provide 2-4 likely answers per question based on the task and available tools. Always include an option with id "other" and label "Other" so the user can type a custom answer.`,
    messages: state.messages,
    tools: { AskQuestion: askQuestionTool },
    toolName: 'AskQuestion',
  });
  if (!toolCall) {
    const message: ModelMessage = {
      role: 'assistant',
      content: 'I need a bit more detail to proceed. Could you clarify your request?',
    };
    return { state: 'DISCOVERY', messages: [...state.messages, message] };
  }

  const input = toolCall.input as AskQuestionInput;
  const message: ModelMessage = {
    role: 'assistant',
    content: [{
      type: 'tool-call',
      toolCallId: toolCall.toolCallId,
      toolName: 'AskQuestion',
      input,
    }],
  };
  return {
    state: 'DISCOVERY',
    messages: [...state.messages, message],
  };
}

export const actionSelectNode = async (
  state: AgentState,
): Promise<{ state: AgentState, options: string[] }> => {
  const availableTools = await listAllTools();
  if (availableTools.length === 0) {
    const message: ModelMessage = {
      role: 'assistant',
      content: 'No tools available to complete this task.',
    };
    return {
      state: { state: 'END', messages: [...state.messages, message] },
      options: [],
    };
  }

  const criteria = buildToolCriteria(availableTools);

  const { answers } = await evaluate({
    model: SYSTEM_ONE_MODEL,
    state: [{
      toolsAvailable: availableTools as JSONValue,
      messages: state.messages as JSONValue,
    }],
    questions: {
      selectedAction: {
        type: 'choice',
        instructions: 'Which action should we call next?',
        criteria,
      },
    },
  });

  const threshold = 1 / (availableTools.length * 2);
  const probabilities = answers.selectedAction.probabilities ?? { [answers.selectedAction.choice]: 1 };
  const options = Object.entries(probabilities)
    .filter(([, probability]) => probability > threshold)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => key);

  const selectedAction = options[0] ?? answers.selectedAction.choice;

  if (answers.selectedAction.choice === "taskCompleted") {
    const message: ModelMessage = {
      role: "assistant",
      content: "Task Complete",
    };
    return {
      state: {
        state: "END", messages: [...state.messages, message],
      },
      options: [],
    };
  } else if (answers.selectedAction.choice === "wrongPath") {
    const message: ModelMessage = {
      role: "assistant",
      content: "Rewinding to last choice",
    };
    return {
      state: {
        state: "REWIND", messages: [...state.messages, message],
      },
      options,
    };
  } else if (answers.selectedAction.choice === "notPossible") {
    const message: ModelMessage = {
      role: "assistant",
      content: "Unable to complete the task with given tools",
    };
    return {
      state: { state: "END", messages: [...state.messages, message] },
      options: [],
    };
  }
  return {
    state: {
      state: 'EXECUTE',
      messages: state.messages,
      selectedTool: selectedAction,
    },
    options,
  };
}

export const runToolNode = async (state: AgentState): Promise<AgentState> => {
  const selectedTool = state.selectedTool;
  if (!selectedTool) {
    const message: ModelMessage = {
      role: 'assistant',
      content: 'No tool selected to run.',
    };
    return { state: 'END', messages: [...state.messages, message] };
  }

  const availableTools = await listAllTools();
  const selected = availableTools.find((t) => toolKey(t) === selectedTool);
  if (!selected) {
    const message: ModelMessage = {
      role: 'assistant',
      content: `Unknown tool: ${selectedTool}`,
    };
    return { state: 'END', messages: [...state.messages, message] };
  }

  const { server, name } = parseToolKey(selectedTool);
  const toolName = toolInvocationName(selectedTool, server, name);
  const aiTool = tool({
    description: selected.description ?? `Call the ${selectedTool} tool`,
    inputSchema: jsonSchema<Record<string, unknown>>(selected.inputSchema as Record<string, unknown>),
  });

  const instructions = name === 'message_answer'
    ? `The user asked a question. Call the ${toolName} tool with a clear, helpful answer based on the conversation and your knowledge.`
    : `Call the ${toolName} tool with the arguments needed to make progress on the user's task.`;

  const toolCall = await generateRequiredToolCall({
    instructions,
    messages: state.messages,
    tools: { [toolName]: aiTool },
    toolName,
  });

  if (!toolCall) {
    const message: ModelMessage = {
      role: 'assistant',
      content: `Could not determine arguments for ${selectedTool}.`,
    };
    return { state: 'EXECUTE', messages: [...state.messages, message], selectedTool };
  }

  const toolCallMessage: ModelMessage = {
    role: 'assistant',
    content: [{
      type: 'tool-call',
      toolCallId: toolCall.toolCallId,
      toolName: selectedTool,
      input: toolCall.input,
    }],
  };

  const toolResult = isDefaultToolKey(selectedTool)
    ? await executeDefaultTool(name, toolCall.input as Record<string, unknown>)
    : isUserToolKey(selectedTool)
      ? await executeUserTool(name, toolCall.input as Record<string, unknown>)
      : await mcpClient.callTool(server, name, toolCall.input as Record<string, unknown>);
  const toolResultMessage = mcpClient.toMessage(toolCall.toolCallId, toolResult);

  return {
    state: 'EXECUTE',
    messages: [...state.messages, toolCallMessage, toolResultMessage],
    selectedTool,
  };
}
