export type StdioServerConfig = {
  enabled?: boolean,
  command: string,
  args?: string[],
  env?: Record<string, string>,
}

export type HttpServerConfig = {
  enabled?: boolean,
  url: string,
  headers?: Record<string, string>,
  // OAuth runs automatically when the server responds 401; set false to disable
  oauth?: boolean | OAuthOptions,
}

export type OAuthOptions = {
  // for servers that don't support dynamic client registration
  clientId?: string,
  clientSecret?: string,
  scope?: string,
  // must match the redirect URI registered with the authorization server
  callbackPort?: number,
}

export type McpServerConfig = StdioServerConfig | HttpServerConfig

export type McpConfig = {
  mcpServers: Record<string, McpServerConfig>,
}

export type McpTool = {
  server: string,
  name: string,
  description?: string,
  inputSchema: Record<string, unknown>,
}

/** Stable id for MCP tools in capability selection and agent actions. */
export const mcpToolKey = (tool: Pick<McpTool, 'server' | 'name'>) =>
  `${tool.server}/${tool.name}`;

export type McpToolResult = {
  server: string,
  tool: string,
  isError: boolean,
  content: string,
}

export type McpConnectionStatus = {
  server: string,
  connected: boolean,
  error?: string,
}
