import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadAppConfig } from './app-config';

const tempRoot = join(import.meta.dir, '__fixtures__', 'app-config');
let previousApiKey: string | undefined;

afterEach(async () => {
  if (previousApiKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
  else process.env.AI_GATEWAY_API_KEY = previousApiKey;
  await rm(tempRoot, { recursive: true, force: true });
});

beforeEach(() => {
  previousApiKey = process.env.AI_GATEWAY_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
});

describe('loadAppConfig', () => {
  test('returns empty config when file is missing', async () => {
    const config = await loadAppConfig(join(tempRoot, 'missing.json'));
    expect(config).toEqual({});
    expect(process.env.AI_GATEWAY_API_KEY).toBeUndefined();
  });

  test('loads aiGatewayApiKey into process.env', async () => {
    await mkdir(tempRoot, { recursive: true });
    const configPath = join(tempRoot, 'config.json');
    await writeFile(configPath, JSON.stringify({ aiGatewayApiKey: 'test-key' }));

    const config = await loadAppConfig(configPath);
    expect(config).toEqual({ aiGatewayApiKey: 'test-key' });
    expect(process.env.AI_GATEWAY_API_KEY).toBe('test-key');
  });
});
