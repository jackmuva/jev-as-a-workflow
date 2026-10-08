import { homedir } from 'node:os';
import { join } from 'node:path';

export const JEV_HOME = join(homedir(), '.jaaw');

export const APP_CONFIG_PATH = join(JEV_HOME, 'config.json');

export const MCP_CONFIG_PATH = join(JEV_HOME, 'mcp.json');

export const MCP_AUTH_DIR = join(JEV_HOME, 'mcp-auth');

export const USER_TOOLS_DIR = join(JEV_HOME, 'tools');

export const COMPACTION_CONTEXT_WINDOW = 32_000;

export const COMPACTION_TOKEN_THRESHOLD = 0.75;

export const SYSTEM_ONE_MODEL = 'typesafe-ai/jev';

export const DEFAULT_LLM_MODEL = 'deepseek/deepseek-v4-flash';

export const AI_GATEWAY_API_KEY_PLACEHOLDER = 'YOUR_VERCEL_AI_GATEWAY_API_KEY';

export const LLM_MODEL = process.env.LLM_MODEL ?? DEFAULT_LLM_MODEL;

export const USER_TOOL_SERVER = 'user';

export const DB_PATH = join(JEV_HOME, 'jaaw-sqlite.db');
