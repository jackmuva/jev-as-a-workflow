import { generateText, type ModelMessage } from 'ai';
import type { AgentState } from '../../../models/agent';

export type CompactionOptions = {
  /** Number of recent assistant/tool messages to retain. Default 4. */
  keepAssistantMessages?: number;
  /** Minimum total messages before compaction runs. Default 8. */
  minMessagesToCompact?: number;
};

const DEFAULT_OPTIONS: Required<CompactionOptions> = {
  keepAssistantMessages: 4,
  minMessagesToCompact: 8,
};

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`;

const messageToText = (message: ModelMessage): string => {
  const prefix = `${message.role}: `;
  if (typeof message.content === 'string') {
    return prefix + message.content;
  }

  const parts = message.content.map((part) => {
    switch (part.type) {
      case 'text':
      case 'reasoning':
        return part.text;
      case 'tool-call':
        return `[tool call: ${part.toolName}(${JSON.stringify(part.input)})]`;
      case 'tool-result':
        if ('value' in part.output) {
          const value = part.output.value;
          const text = typeof value === 'string' ? value : JSON.stringify(value);
          return `[tool result: ${part.toolName}: ${truncate(text, 500)}]`;
        }
        return `[tool result: ${part.toolName}: ${part.output.type}]`;
      default:
        return `[${part.type}]`;
    }
  });

  return prefix + parts.join('\n');
};

const getRetainedIndices = (
  messages: ModelMessage[],
  keepAssistantCount: number,
): Set<number> => {
  const retained = new Set<number>();

  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.role === 'system') {
      retained.add(i);
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === 'user') {
      retained.add(i);
      break;
    }
  }

  let count = 0;
  for (let i = messages.length - 1; i >= 0 && count < keepAssistantCount; i--) {
    const message = messages[i];
    if (!message) continue;
    if (message.role === 'assistant' || message.role === 'tool') {
      retained.add(i);
      count++;
    }
  }

  return retained;
};

export const compactMessages = async (
  messages: ModelMessage[],
  options: CompactionOptions = {},
): Promise<ModelMessage[]> => {
  const { keepAssistantMessages, minMessagesToCompact } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (messages.length < minMessagesToCompact) {
    return messages;
  }

  const retained = getRetainedIndices(messages, keepAssistantMessages);
  const toSummarize = messages.filter((_, index) => !retained.has(index));

  if (toSummarize.length === 0) {
    return messages;
  }

  const transcript = toSummarize.map(messageToText).join('\n\n');
  const { text: summary } = await generateText({
    model: 'deepseek/deepseek-v4.1-flash',
    instructions:
      'Summarize the following conversation history concisely. Preserve the user\'s goal, key decisions, important tool results, and progress made. Omit redundant details.',
    prompt: transcript,
  });

  const summaryMessage: ModelMessage = {
    role: 'assistant',
    content: `[Conversation summary]\n${summary}`,
  };

  const kept = messages.filter((_, index) => retained.has(index));
  const systemMessages = kept.filter((message) => message.role === 'system');
  const otherKept = kept.filter((message) => message.role !== 'system');
  return [...systemMessages, summaryMessage, ...otherKept];
};

/** Compacts agent message history after a tool call. */
export const compactionHook = async (state: AgentState): Promise<AgentState> => {
  const messages = await compactMessages(state.messages);
  return messages === state.messages ? state : { ...state, messages };
};
