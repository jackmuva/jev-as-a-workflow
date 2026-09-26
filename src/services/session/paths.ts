import { homedir } from 'node:os';
import { join } from 'node:path';

export const JEV_HOME = join(homedir(), '.jev-workflow-runner');
export const SESSION_DB_PATH = join(JEV_HOME, 'sessions.db');
