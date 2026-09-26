import type { ModelMessage } from 'ai';

export const preparePrompt = (
  instructions: string,
  messages: ModelMessage[],
): { instructions: string; messages: ModelMessage[] } => {
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
