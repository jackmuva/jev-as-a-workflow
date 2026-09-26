import { jsonSchema, tool } from 'ai';

export type WebSearchInput = {
  query: string;
  numResults?: number;
  livecrawl?: 'fallback' | 'preferred';
  type?: 'auto' | 'fast' | 'deep';
  contextMaxCharacters?: number;
};

const webSearchInputSchema = jsonSchema<WebSearchInput>({
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Websearch query',
    },
    numResults: {
      type: 'number',
      description: 'Number of search results to return (default: 8)',
    },
    livecrawl: {
      type: 'string',
      enum: ['fallback', 'preferred'],
      description: "Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling (default: 'fallback')",
    },
    type: {
      type: 'string',
      enum: ['auto', 'fast', 'deep'],
      description: "Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search",
    },
    contextMaxCharacters: {
      type: 'number',
      description: 'Maximum characters for context string optimized for LLMs (default: 10000)',
    },
  },
  required: ['query'],
});

const currentYear = () => new Date().getFullYear().toString();

export const webSearchDescription = `- Search the web using Exa - performs real-time web searches and can scrape content from specific URLs
- Provides up-to-date information for current events and recent data
- Supports configurable result counts and returns the content from the most relevant websites
- Use this tool for accessing information beyond knowledge cutoff

The current year is ${currentYear()}. You MUST use this year when searching for recent information or current events
- Example: If the current year is 2026 and the user asks for "latest AI news", search for "AI news 2026", NOT "AI news 2025"`;

const EXA_URL = process.env.EXA_API_KEY
  ? `https://mcp.exa.ai/mcp?exaApiKey=${encodeURIComponent(process.env.EXA_API_KEY)}`
  : 'https://mcp.exa.ai/mcp';

const parseMcpResponse = (body: string): string | undefined => {
  const tryParse = (payload: string) => {
    const trimmed = payload.trim();
    if (!trimmed.startsWith('{')) return undefined;
    try {
      const data = JSON.parse(trimmed) as {
        result?: { content?: Array<{ type?: string, text?: string }> },
      };
      return data.result?.content?.find((item) => item.text)?.text;
    } catch {
      return undefined;
    }
  };

  const direct = tryParse(body);
  if (direct) return direct;

  for (const line of body.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const parsed = tryParse(line.slice(6));
    if (parsed) return parsed;
  }
  return undefined;
};

const callExaSearch = async (input: WebSearchInput): Promise<string | undefined> => {
  const response = await fetch(EXA_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'web_search_exa',
        arguments: {
          query: input.query,
          type: input.type ?? 'auto',
          numResults: input.numResults ?? 8,
          livecrawl: input.livecrawl ?? 'fallback',
          contextMaxCharacters: input.contextMaxCharacters,
        },
      },
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`Web search request failed: ${response.status} ${response.statusText}`);
  }

  return parseMcpResponse(await response.text());
};

export const executeWebSearch = async (input: WebSearchInput): Promise<string> => {
  const result = await callExaSearch(input);
  return result ?? 'No search results found. Please try a different query.';
};

export const webSearchTool = tool({
  description: webSearchDescription,
  inputSchema: webSearchInputSchema,
  execute: executeWebSearch,
});

export const webSearchToolSchema = webSearchInputSchema.jsonSchema as Record<string, unknown>;
