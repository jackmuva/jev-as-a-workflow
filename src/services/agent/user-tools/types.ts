export const USER_TOOL_SERVER = 'user';

/** Contract for a module in ~/.jev-workflow-runner/tools/*.ts */
export type UserToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
};
