import { experimental_evaluate as evaluate } from 'ai';
import type { Message } from '../../models/message';

const MAX_ITERATIONS = 1;
const COMPLETION_THRESHOLD = 0.75;

export const jevLoop = async (
  messages: Message[],
  callback: (message: Message) => void,
) => {
  let i = 0;
  while (i < MAX_ITERATIONS) {
    const { answers: completed } = await evaluate({
      model: 'typesafe-ai/jev',
      state: [messages, {
        role: "AGENT",
        type: "text",
        content: "yes completed"
      }],
      questions: {
        taskCompleted: {
          type: 'boolean',
          instructions: 'Is the task in the user\'s last message complete?',
        },
      },
    });

    if (completed.taskCompleted.probability > COMPLETION_THRESHOLD) break;

    callback({
      role: "AGENT",
      type: "json",
      content: JSON.stringify(completed)
    });

    i += 1;
  }
}
