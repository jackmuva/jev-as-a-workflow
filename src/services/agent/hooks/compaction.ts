import { generateText, type ModelMessage } from 'ai';
import {
  COMPACTION_CONTEXT_WINDOW,
  COMPACTION_TOKEN_THRESHOLD,
  LLM_MODEL,
} from '../../../constants';
import { recordLlmUsage } from '../../llm/session-usage';
import type { AgentState, JevMessage } from '../../../models/agent';
import { jevMessage } from '../utils/jev-message';

export type CompactionOptions = {
  /** Number of recent assistant/tool messages to retain. Default 4. */
  keepAssistantMessages?: number;
  /** Model context window in tokens. Defaults to COMPACTION_CONTEXT_WINDOW. */
  contextWindow?: number;
  /** Fraction of context window that triggers compaction (0–1). Defaults to COMPACTION_TOKEN_THRESHOLD. */
  tokenThreshold?: number;
};

const DEFAULT_OPTIONS: Required<CompactionOptions> = {
  keepAssistantMessages: 4,
  contextWindow: COMPACTION_CONTEXT_WINDOW,
  tokenThreshold: COMPACTION_TOKEN_THRESHOLD,
};

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`;

type MessageTextOptions = {
  /** Truncate tool-result payloads when building text (for summarization). Omit to keep full content. */
  truncateToolResults?: number;
};

const messageToText = (message: ModelMessage, options: MessageTextOptions = {}): string => {
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
          const payload = options.truncateToolResults != null
            ? truncate(text, options.truncateToolResults)
            : text;
          return `[tool result: ${part.toolName}: ${payload}]`;
        }
        return `[tool result: ${part.toolName}: ${part.output.type}]`;
      default:
        return `[${part.type}]`;
    }
  });

  return prefix + parts.join('\n');
};

/** Rough token estimate (~3 chars per token; conservative for code/JSON). */
const estimateTokens = (text: string): number => Math.ceil(text.length / 3);

const estimateMessageTokens = ({ message }: JevMessage): number =>
  estimateTokens(messageToText(message));

export const estimateMessagesTokens = (messages: JevMessage[]): number =>
  messages.reduce((total, message) => total + estimateMessageTokens(message), 0);

const getRetainedIndices = (
  messages: JevMessage[],
  keepAssistantCount: number,
): Set<number> => {
  const retained = new Set<number>();

  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.message.role === 'system') {
      retained.add(i);
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]?.message;
    if (message?.role === 'user') {
      retained.add(i);
      break;
    }
  }

  let count = 0;
  for (let i = messages.length - 1; i >= 0 && count < keepAssistantCount; i--) {
    const message = messages[i]?.message;
    if (!message) continue;
    if (message.role === 'assistant' || message.role === 'tool') {
      retained.add(i);
      count++;
    }
  }

  return retained;
};

export const compactMessages = async (
  messages: JevMessage[],
  force: boolean = false,
  options: CompactionOptions = {},
): Promise<JevMessage[]> => {
  const { keepAssistantMessages, contextWindow, tokenThreshold } = { ...DEFAULT_OPTIONS, ...options, };
  const tokenLimit = contextWindow * tokenThreshold;

  if (estimateMessagesTokens(messages) < tokenLimit && !force) return messages;

  const retained = getRetainedIndices(messages, keepAssistantMessages);
  const toSummarize = messages.filter((_, index) => !retained.has(index));

  if (toSummarize.length === 0) return messages;

  const transcript = toSummarize.map(({ message }) => messageToText(message, { truncateToolResults: 2_000 }))
    .join('\n\n');
  const summaryResult = await generateText({
    model: LLM_MODEL,
    instructions:
      'Summarize the following conversation history concisely. Preserve the user\'s goal, key decisions, important tool results, and progress made. Omit redundant details.',
    prompt: transcript,
  });
  recordLlmUsage(summaryResult);
  const { text: summary } = summaryResult;

  const summaryMessage = jevMessage(
    { role: 'assistant', content: summary },
    undefined,
    'summary',
  );

  const kept = messages.filter((_, index) => retained.has(index));
  const systemMessages = kept.filter(({ message }) => message.role === 'system');
  const otherKept = kept.filter(({ message }) => message.role !== 'system');
  return [...systemMessages, summaryMessage, ...otherKept];
};

export const compactionHook = async (state: AgentState, force: boolean = false): Promise<AgentState> => {
  const messages = await compactMessages(state.messages, force);
  return messages === state.messages ? state : { ...state, messages };
};
