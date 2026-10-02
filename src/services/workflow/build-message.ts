import type { ModelMessage } from 'ai';
import type { WorkflowRecord } from '../../models/workflow';

const formatStep = (step: WorkflowRecord['steps'][number], index: number): string => {
  const lines = [
    `${index + 1}. **Intent:** ${step.intent}`,
    `   **Action:** ${step.action}`,
  ];

  if (step.toolParameters && Object.keys(step.toolParameters).length > 0) {
    lines.push(`   **Tool parameters:** ${JSON.stringify(step.toolParameters)}`);
  }

  return lines.join('\n');
};

export const buildWorkflowUserMessage = (
  workflow: WorkflowRecord,
  userInstructions: string,
): ModelMessage => {
  const stepsText = workflow.steps.map(formatStep).join('\n\n');
  const instructionsBlock = userInstructions.trim()
    ? `\n\n## Additional instructions\n\n${userInstructions.trim()}`
    : '';

  return {
    role: 'user',
    content: [
      'Execute this workflow step by step.',
      'Adapt {{placeholder}} values using the additional instructions below.',
      '',
      '## Goal',
      '',
      workflow.goal,
      '',
      '## Steps',
      '',
      stepsText,
      instructionsBlock,
    ].join('\n'),
  };
};
