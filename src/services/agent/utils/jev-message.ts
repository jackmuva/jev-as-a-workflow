import type { ModelMessage } from 'ai';
import type { ChoiceProbabilities, JevMessage, JevMessageFrame } from '../../../models/agent';

export const jevMessage = (
  message: ModelMessage,
  probabilities?: ChoiceProbabilities,
  frame?: JevMessageFrame,
): JevMessage => ({
  message,
  ...(probabilities && { probabilities }),
  ...(frame && { frame }),
});

export const toModelMessages = (messages: JevMessage[]): ModelMessage[] =>
  messages.map(({ message }) => message);
