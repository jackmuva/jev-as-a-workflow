import { generateText, type ModelMessage } from 'ai';
import {
  COMPACTION_CONTEXT_WINDOW,
  COMPACTION_TOKEN_THRESHOLD,
  LLM_MODEL,
} from '../../../constants';
import { recordLlmUsage } from './session-usage';
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

const truncateToolResultParts = (message: ModelMessage, maxChars: number): ModelMessage => {
  if (message.role === 'assistant' && typeof message.content === 'string') {
    if (message.content.length <= maxChars) return message;
    return { ...message, content: truncate(message.content, maxChars) };
  }
  if (message.role !== 'tool' && message.role !== 'assistant') return message;
  if (!Array.isArray(message.content)) return message;

  let changed = false;
  const content = message.content.map((part) => {
    if (part.type !== 'tool-result' || !('value' in part.output)) return part;
    const value = part.output.value;
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (text.length <= maxChars) return part;
    changed = true;
    return { ...part, output: { ...part.output, value: truncate(text, maxChars) } };
  });

  return changed ? { ...message, content } as ModelMessage : message;
};

/** Shrink retained tool payloads when summarization cannot run (everything is in the keep window). */
export const shrinkMessagesToTokenBudget = (
  messages: JevMessage[],
  tokenLimit: number,
): JevMessage[] => {
  if (estimateMessagesTokens(messages) <= tokenLimit) return messages;

  let maxChars = 12_000;
  let current = messages;

  while (estimateMessagesTokens(current) > tokenLimit && maxChars >= 400) {
    const toolIndices = current
      .map((entry, index) => (entry.message.role === 'tool' ? index : -1))
      .filter((index) => index >= 0);
    const protectLatestTool = toolIndices.at(-1);

    current = current.map((entry, index) => {
      const limit = index === protectLatestTool && maxChars > 800 ? maxChars * 2 : maxChars;
      const message = truncateToolResultParts(entry.message, limit);
      return message === entry.message ? entry : { ...entry, message };
    });
    maxChars -= 400;
  }

  if (estimateMessagesTokens(current) > tokenLimit) {
    current = current.map((entry) => {
      if (entry.message.role !== 'tool' && entry.message.role !== 'assistant') return entry;
      const message = truncateToolResultParts(entry.message, 400);
      return message === entry.message ? entry : { ...entry, message };
    });
  }

  return current;
};

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

  let result = messages;

  if (toSummarize.length > 0) {
    const transcript = toSummarize.map(({ message }) => messageToText(message, { truncateToolResults: 2_000 }))
      .join('\n\n');
    const summaryResult = await generateText({
      model: LLM_MODEL,
      instructions:
        `Summarize the following conversation history concisely. Preserve the user's goal, key decisions, important tool results, and progress made. Omit redundant details.\n\n` +
        `Important: Keep the summary compact — it must be significantly shorter than the compaction context window of ${contextWindow} tokens. That window is used at a threshold of ${Math.round(tokenThreshold * 100)}% (i.e. a budget of ${tokenLimit} tokens), and the summary is re-fed into the model alongside other retained messages. So it must comfortably fit within that limit. Optimize for a tight, information-dense summary — favor the user's goal, key decisions, important tool results, and progress over verbatim detail.`,
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
    result = [...systemMessages, summaryMessage, ...otherKept];
  }

  const shrunk = shrinkMessagesToTokenBudget(result, tokenLimit);
  return shrunk === result && result === messages ? messages : shrunk;
};

export const compactionHook = async (state: AgentState, force: boolean = false): Promise<AgentState> => {
  const messages = await compactMessages(state.messages, force);
  return messages === state.messages ? state : { ...state, messages };
};
