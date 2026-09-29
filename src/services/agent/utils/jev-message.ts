import type { ModelMessage } from 'ai';
import type { ChoiceProbabilities, JevMessage } from '../../../models/agent';

export const jevMessage = (message: ModelMessage, probabilities?: ChoiceProbabilities): JevMessage =>
  probabilities ? { message, probabilities } : { message };

export const toModelMessages = (messages: JevMessage[]): ModelMessage[] =>
  messages.map(({ message }) => message);
