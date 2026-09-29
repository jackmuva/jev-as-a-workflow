import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { ToolModelMessage } from 'ai';
import { FileOAuthProvider } from './oauth-provider';
import type {
  HttpServerConfig,
  McpConfig,
  McpConnectionStatus,
  McpServerConfig,
  McpTool,
  McpToolResult,
} from '../../models/mcp';
import { join } from 'node:path';
import { JEV_HOME } from '../../constants';

const CLIENT_INFO = { name: 'jev-workflow-runner', version: '0.1.0' };

const createStdioTransport = (config: Exclude<McpServerConfig, HttpServerConfig>): Transport =>
  new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: { ...(process.env as Record<string, string>), ...config.env },
    // pipe server logs so they don't draw over the TUI
    stderr: 'pipe',
  });

const createHttpTransport = (config: HttpServerConfig, authProvider?: FileOAuthProvider) =>{
  return new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers: config.headers },
    authProvider,
  });
}

type ContentPart = { type: string, text?: string, mimeType?: string, resource?: { uri?: string, text?: string } };

const formatContent = (parts: ContentPart[]): string =>
  parts.map((part) => {
    switch (part.type) {
      case 'text':
        return part.text ?? '';
      case 'resource':
        return part.resource?.text ?? `[resource: ${part.resource?.uri}]`;
      default:
        return `[${part.type}${part.mimeType ? `: ${part.mimeType}` : ''}]`;
    }
  }).join('\n');

export type McpClientManagerOptions = {
  onAuthorize?: (server: string, url: URL) => void,
};

export class McpClientManager {
  private config: McpConfig = { mcpServers: {} };
  private clients = new Map<string, Client>();
  private toolCache: McpTool[] | null = null;

  constructor(private readonly options: McpClientManagerOptions = {}) { }

  async loadConfig(path = join(JEV_HOME, 'mcp.json')) {
    const file = Bun.file(path);
    this.config = (await file.exists())
      ? await file.json() as McpConfig
      : { mcpServers: {} };
    return this.config;
  }

  async connect(name: string, config: McpServerConfig) {
    await this.disconnect(name);

    const client = config.type === 'http'
      ? await this.connectHttp(name, config)
      : await this.connectClient(createStdioTransport(config));
    this.clients.set(name, client);
    this.toolCache = null;
    return client;
  }

  async connectAll(): Promise<McpConnectionStatus[]> {
    const entries = Object.entries(this.config.mcpServers);
    const results = await Promise.allSettled(
      entries.map(([name, config]) => this.connect(name, config)),
    );

    return results.map((result, i) => ({
      server: entries[i]![0],
      connected: result.status === 'fulfilled',
      error: result.status === 'rejected' ? String(result.reason) : undefined,
    }));
  }

  /** Forget stored OAuth credentials so the next connect re-authorizes. */
  async logout(name: string) {
    await this.disconnect(name);
    const config = this.config.mcpServers[name];
    if (config?.type === 'http') await this.createAuthProvider(name, config)?.invalidateCredentials('all');
  }

  private async connectClient(transport: Transport) {
    const client = new Client(CLIENT_INFO);
    await client.connect(transport);
    return client;
  }

  private async connectHttp(name: string, config: HttpServerConfig) {
    const authProvider = this.createAuthProvider(name, config);
    const transport = createHttpTransport(config, authProvider);
    try {
      return await this.connectClient(transport);
    } catch (error) {
      if (!(error instanceof UnauthorizedError) || !authProvider) throw error;

      // the provider opened the browser; exchange the code, then reconnect with the new tokens
      const code = await authProvider.waitForAuthorizationCode();
      await transport.finishAuth(code);
      return this.connectClient(createHttpTransport(config, authProvider));
    }
  }

  private createAuthProvider(name: string, config: HttpServerConfig) {
    if (config.oauth === false) return undefined;
    const oauthOptions = typeof config.oauth === 'object' ? config.oauth : {};
    return new FileOAuthProvider(name, config.url, oauthOptions, this.options.onAuthorize);
  }

  async disconnect(name: string) {
    const client = this.clients.get(name);
    if (!client) return;
    this.clients.delete(name);
    this.toolCache = null;
    await client.close();
  }

  listServers() {
    return [...this.clients.keys()];
  }

  async listTools(): Promise<McpTool[]> {
    if (this.toolCache) return this.toolCache;

    const perServer = await Promise.all(
      [...this.clients].map(async ([server, client]) => {
        const tools: McpTool[] = [];
        let cursor: string | undefined;
        do {
          const page = await client.listTools({ cursor });
          tools.push(...page.tools.map((tool) => ({
            server,
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })));
          cursor = page.nextCursor;
        } while (cursor);
        return tools;
      }),
    );

    this.toolCache = perServer.flat();
    return this.toolCache;
  }

  refreshTools() {
    this.toolCache = null;
    return this.listTools();
  }

  async callTool(
    server: string,
    tool: string,
    args: Record<string, unknown> = {},
  ): Promise<McpToolResult> {
    const client = this.clients.get(server);
    if (!client) {
      return { server, tool, isError: true, content: `Unknown MCP server: ${server}` };
    }

    try {
      const result = await client.callTool({ name: tool, arguments: args });
      const content = 'content' in result
        ? formatContent(result.content as ContentPart[])
        : JSON.stringify(result.toolResult);
      return { server, tool, isError: Boolean(result.isError), content };
    } catch (error) {
      return {
        server,
        tool,
        isError: true,
        content: error instanceof Error ? error.message : String(error),
      };
    }
  }

  toMessage(toolCallId: string, result: McpToolResult): ToolModelMessage {
    return {
      role: 'tool',
      content: [{
        type: 'tool-result',
        toolCallId,
        toolName: `${result.server}/${result.tool}`,
        output: { type: result.isError ? 'error-text' : 'text', value: result.content },
      }],
    };
  }

  async close() {
    await Promise.allSettled([...this.clients.keys()].map((name) => this.disconnect(name)));
  }
}

export const mcpClient = new McpClientManager({
  onAuthorize: (server, url) => console.error(`[mcp] Authorize "${server}" in your browser: ${url}`),
});
