import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { JEV_HOME } from '../../constants';
import type { AppConfig } from '../../models/config';

export const APP_CONFIG_PATH = join(JEV_HOME, 'config.json');

export async function loadAppConfig(path = APP_CONFIG_PATH): Promise<AppConfig> {
  const file = Bun.file(path);
  if (!(await file.exists())) return {};

  const config = await file.json() as AppConfig;
  if (config.aiGatewayApiKey) {
    process.env.AI_GATEWAY_API_KEY = config.aiGatewayApiKey;
  }
  if (config.llmModel) {
    process.env.LLM_MODEL = config.llmModel;
  }
  return config;
}

export async function ensureJevHome(): Promise<void> {
  mkdirSync(JEV_HOME, { recursive: true });
}
