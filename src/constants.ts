import { homedir } from 'node:os';
import { join } from 'node:path';

export const JEV_HOME = join(homedir(), '.jev-workflow-runner');

export const COMPACTION_CONTEXT_WINDOW = 32_000;

export const COMPACTION_TOKEN_THRESHOLD = 0.75;

export const SYSTEM_ONE_MODEL = 'typesafe-ai/jev';

export const LLM_MODEL = 'deepseek/deepseek-v4-flash';
