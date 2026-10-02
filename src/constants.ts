import { homedir } from 'node:os';
import { join } from 'node:path';

export const JEV_HOME = join(homedir(), '.jaaw');

export const COMPACTION_CONTEXT_WINDOW = 32_000;

export const COMPACTION_TOKEN_THRESHOLD = 0.75;

export const SYSTEM_ONE_MODEL = 'typesafe-ai/jev';

export const LLM_MODEL = process.env.LLM_MODEL ?? 'deepseek/deepseek-v4-flash';

export const USER_TOOL_SERVER = 'user';

export const DB_PATH = join(JEV_HOME, 'jaaw-sqlite.db');

