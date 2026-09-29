import { jsonSchema, tool, type ModelMessage } from 'ai';

export type CreatePlanInput = {
  plan: string;
};

export const wrapPlanToolMessages = (
  plan: string,
  toolCallId: string = crypto.randomUUID(),
): [ModelMessage, ModelMessage] => {
  const input: CreatePlanInput = { plan };

  return [
    {
      role: 'assistant',
      content: [{
        type: 'tool-call',
        toolCallId,
        toolName: 'CreatePlan',
        input,
      }],
    },
    {
      role: 'tool',
      content: [{
        type: 'tool-result',
        toolCallId,
        toolName: 'CreatePlan',
        output: { type: 'text', value: plan },
      }],
    },
  ];
};

const createPlanInputSchema = jsonSchema<CreatePlanInput>({
  type: 'object',
  properties: {
    plan: {
      type: 'string',
      description: 'A short numbered list of steps to complete the task',
    },
  },
  required: ['plan'],
});

export const createPlanTool = tool({
  description: 'Present a step-by-step plan for completing a multi-step task.',
  inputSchema: createPlanInputSchema,
});
