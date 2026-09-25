import { experimental_evaluate as evaluate } from 'ai';

export const jevLoop = async (
  inputMessage: string,
  callback: (message: string) => void,
) => {
  const { answers } = await evaluate({
    model: 'typesafe-ai/jev',
    state: inputMessage,
    questions: {
      refunded: {
        type: 'boolean',
        instructions: 'Was a refund issued?',
      },
    },
  });

  callback(answers.toString());
}
