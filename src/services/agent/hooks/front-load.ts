import type { ModelMessage } from 'ai';
import { join } from 'path';

export const AGENTS_MD_FILENAME = 'AGENTS.md';

export const frontLoadMessages = async (
  rootDir = process.cwd(),
): Promise<ModelMessage[]> => {
  const path = join(rootDir, AGENTS_MD_FILENAME);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return [];
  }

  const content = (await file.text()).trim();
  if (!content) {
    return [];
  }

  return [{ role: 'system', content }];
};
