import { homedir } from 'node:os';
import { join } from 'node:path';

export const JEV_HOME = join(homedir(), '.jev-workflow-runner');
