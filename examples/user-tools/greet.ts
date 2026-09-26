/**
 * Example user tool — copy to ~/.jev-workflow-runner/tools/greet.ts
 *
 * Each .ts file in that directory should export:
 *   - name: unique tool identifier
 *   - description: shown to the agent when selecting tools
 *   - inputSchema: JSON Schema for tool arguments
 *   - execute: async function returning a string result
 *
 * The tool will appear as user/greet in the agent.
 */

export default {
  name: 'greet',
  description: 'Return a friendly greeting for the given name.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name to greet',
      },
    },
    required: ['name'],
  },
  async execute(args: Record<string, unknown>) {
    const name = typeof args.name === 'string' ? args.name.trim() : '';
    if (!name) throw new Error('name is required');
    return `Hello, ${name}!`;
  },
};
