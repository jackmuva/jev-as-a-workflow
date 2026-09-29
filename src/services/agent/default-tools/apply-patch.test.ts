import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { executeApplyPatch } from './apply-patch';

const tempDirs: string[] = [];
let savedCwd = process.cwd();

afterEach(async () => {
  process.chdir(savedCwd);
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const withWorkspace = async (run: (workspace: string) => Promise<void>) => {
  const workspace = await mkdtemp(join(tmpdir(), 'apply-patch-test-'));
  tempDirs.push(workspace);
  const previousCwd = process.cwd();
  process.chdir(workspace);
  try {
    await run(workspace);
  } finally {
    process.chdir(previousCwd);
  }
};

describe('executeApplyPatch', () => {
  test('applies merged update sections to the same file', async () => {
    await withWorkspace(async (workspace) => {
      await mkdir(join(workspace, 'src'), { recursive: true });
      await writeFile(
        join(workspace, 'src/a.ts'),
        ['const a = 1;', 'const b = 2;', 'const c = 3;'].join('\n') + '\n',
        'utf-8',
      );

      const result = await executeApplyPatch({
        patchText: `*** Begin Patch
*** Update File: src/a.ts
@@
-const a = 1;
+const a = 9;
*** Update File: src/a.ts
@@
-const c = 3;
+const c = 7;
*** End Patch`,
      });

      expect(result).toContain('M src/a.ts');
      expect(await readFile(join(workspace, 'src/a.ts'), 'utf-8')).toBe(
        ['const a = 9;', 'const b = 2;', 'const c = 7;'].join('\n') + '\n',
      );
    });
  });

  test('surfaces strict parser errors', async () => {
    await withWorkspace(async () => {
      await expect(executeApplyPatch({
        patchText: '*** Begin Patch\n*** End Patch',
      })).rejects.toThrow('apply_patch verification failed: Invalid patch format: patch must include at least one file operation');
    });
  });
});
