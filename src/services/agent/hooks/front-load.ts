import type { ModelMessage } from 'ai';
import { join, resolve } from 'path';

export const AGENTS_MD_FILENAME = 'AGENTS.md';

export const frontLoadMessages = async (
  rootDir = process.cwd(),
): Promise<ModelMessage[]> => {
  const workspace = resolve(rootDir);
  const messages: ModelMessage[] = [{
    role: 'system',
    content:
      `Workspace root: ${workspace}\n` +
      'For file tools (read, edit, write, list_dir, glob), use paths relative to this directory (e.g. "src/index.ts"). ' +
      'Do not use root-relative paths like "/src/index.ts".',
  }];

  const path = join(rootDir, AGENTS_MD_FILENAME);
  const file = Bun.file(path);
  if (await file.exists()) {
    const content = (await file.text()).trim();
    if (content) {
      messages.push({ role: 'system', content });
    }
  }

  return messages;
};
