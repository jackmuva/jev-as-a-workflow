import type { ModelMessage } from 'ai';
import type { JevMessage } from '../../models/agent';
import { toModelMessages } from './utils/jev-message';

export const preparePrompt = (
  instructions: string,
  jevMessages: JevMessage[],
): { instructions: string; messages: ModelMessage[] } => {
  const messages = toModelMessages(jevMessages);
  const systemTexts = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.role !== 'system' ? '' : message.content)
    .filter(Boolean);

  const chatMessages = messages.filter((message) => message.role !== 'system');

  const mergedInstructions = systemTexts.length > 0
    ? `${systemTexts.join('\n\n')}\n\n${instructions}`
    : instructions;

  return { instructions: mergedInstructions, messages: chatMessages };
};
