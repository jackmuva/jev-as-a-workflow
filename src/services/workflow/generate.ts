import { generateText } from 'ai';
import { LLM_MODEL } from '../../constants';
import type { JevMessage } from '../../models/agent';
import type { GeneratedWorkflow, WorkflowStep } from '../../models/workflow';
import { extractToolCalls, hasConversationContent } from './extract-tool-calls';

const stringifyToolCalls = (calls: ReturnType<typeof extractToolCalls>): string =>
  calls.length === 0
    ? '(none)'
    : calls.map((call, index) => `${index + 1}. ${call.toolName}(${JSON.stringify(call.input)})`).join('\n');

const messageToSummaryLine = ({ message }: JevMessage): string | null => {
  if (message.role === 'user') {
    const text = typeof message.content === 'string'
      ? message.content
      : Array.isArray(message.content)
        ? message.content.map((part) => ('text' in part ? part.text : '')).join('')
        : '';
    return `user: ${text.trim()}`;
  }

  if (message.role === 'assistant') {
    if (typeof message.content === 'string') {
      return message.content.trim() ? `assistant: ${message.content.trim()}` : null;
    }

    if (!Array.isArray(message.content)) return null;

    const parts = message.content.map((part) => {
      if (part.type === 'text' || part.type === 'reasoning') return part.text;
      if (part.type === 'tool-call') return `[tool ${part.toolName}(${JSON.stringify(part.input)})]`;
      return '';
    }).filter(Boolean);

    return parts.length > 0 ? `assistant: ${parts.join(' ')}` : null;
  }

  return null;
};

const parseGeneratedWorkflow = (text: string): GeneratedWorkflow => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced?.[1]?.trim() ?? trimmed;
  const parsed = JSON.parse(payload) as GeneratedWorkflow;

  if (!parsed.title?.trim() || !parsed.goal?.trim() || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Generated workflow is missing required fields');
  }

  const steps: WorkflowStep[] = parsed.steps.map((step) => ({
    intent: step.intent.trim(),
    action: step.action.trim(),
    ...(step.toolParameters && Object.keys(step.toolParameters).length > 0
      ? { toolParameters: step.toolParameters }
      : {}),
  }));

  return {
    title: parsed.title.trim(),
    goal: parsed.goal.trim(),
    steps,
  };
};

export class WorkflowGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowGenerationError';
  }
}

export const generateWorkflowFromSession = async (
  messages: JevMessage[],
): Promise<GeneratedWorkflow> => {
  const conversation = messages.filter(({ message }) => message.role !== 'system');
  if (!hasConversationContent(conversation)) {
    throw new WorkflowGenerationError('Selected session has no conversation to generate a workflow from');
  }

  const toolCalls = extractToolCalls(conversation);
  const conversationSummary = conversation
    .map(messageToSummaryLine)
    .filter((line): line is string => line !== null)
    .join('\n');

  const instructions = `You analyze completed agent sessions and produce reusable workflows.

Given the conversation and tool-call trace below, return JSON with:
- title: short workflow name (max 80 chars)
- goal: one sentence describing the outcome
- steps: array of { intent, action, toolParameters? }

For each step:
- intent: why the step exists
- action: imperative description of what to do (mention tools when relevant)
- toolParameters: optional string map of tool arguments; use {{placeholder}} for values that should come from the user's instructions later

Remove failed or exploratory steps. Keep the successful path. Include at least one step.

Conversation:
${conversationSummary}

Tool-call trace:
${stringifyToolCalls(toolCalls)}`;

  const { text } = await generateText({
    model: LLM_MODEL,
    prompt: instructions,
  });

  if (!text.trim()) {
    throw new WorkflowGenerationError('Workflow generation returned an empty response');
  }

  try {
    return parseGeneratedWorkflow(text);
  } catch {
    throw new WorkflowGenerationError('Could not parse generated workflow JSON');
  }
};
