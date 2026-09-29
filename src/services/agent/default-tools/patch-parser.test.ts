import { describe, expect, test } from 'bun:test';
import { deriveNewContentsFromChunks, normalizeHunks, parsePatch } from './patch-parser';

const wrap = (body: string) => `*** Begin Patch\n${body}\n*** End Patch`;

describe('parsePatch', () => {
  test('parses add, update, and delete hunks', () => {
    const patch = wrap(`*** Add File: hello.txt
+Hello world
*** Update File: src/app.ts
@@
-const x = 1;
+const x = 2;
*** Delete File: obsolete.txt`);

    expect(parsePatch(patch).hunks).toEqual([
      { type: 'add', path: 'hello.txt', contents: 'Hello world' },
      {
        type: 'update',
        path: 'src/app.ts',
        chunks: [{
          old_lines: ['const x = 1;'],
          new_lines: ['const x = 2;'],
        }],
      },
      { type: 'delete', path: 'obsolete.txt' },
    ]);
  });

  test('requires patch to start with Begin marker', () => {
    expect(() => parsePatch('garbage\n*** End Patch')).toThrow("patch must start with '*** Begin Patch'");
  });

  test('requires patch to end with End marker', () => {
    expect(() => parsePatch('*** Begin Patch\n*** Add File: a.txt\n+hi')).toThrow(
      "patch must end with '*** End Patch'",
    );
  });

  test('rejects preamble before Begin marker', () => {
    expect(() => parsePatch(`garbage\n${wrap('*** Add File: a.txt\n+hi')}`)).toThrow(
      "patch must start with '*** Begin Patch'",
    );
  });

  test('rejects unknown lines inside the patch envelope', () => {
    expect(() => parsePatch(wrap('not a header\n*** Add File: a.txt\n+hi'))).toThrow(
      'expected file operation header',
    );
  });

  test('rejects empty patch', () => {
    expect(() => parsePatch('*** Begin Patch\n*** End Patch')).toThrow(
      'patch must include at least one file operation',
    );
  });

  test('rejects add file lines without + prefix', () => {
    expect(() => parsePatch(wrap('*** Add File: a.txt\nhello'))).toThrow(
      "add file content lines must start with '+'",
    );
  });

  test('rejects update sections with non-hunk lines', () => {
    expect(() => parsePatch(wrap('*** Update File: a.ts\nconst x = 1;'))).toThrow(
      'expected hunk marker @@',
    );
  });

  test('normalizes CRLF line endings', () => {
    const patch = '*** Begin Patch\r\n*** Add File: a.txt\r\n+hi\r\n*** End Patch\r\n';
    expect(parsePatch(patch).hunks).toEqual([
      { type: 'add', path: 'a.txt', contents: 'hi' },
    ]);
  });

  test('strips heredoc wrappers', () => {
    const patch = `<<'PATCH'
*** Begin Patch
*** Add File: a.txt
+hi
*** End Patch
PATCH`;

    expect(parsePatch(patch).hunks).toEqual([
      { type: 'add', path: 'a.txt', contents: 'hi' },
    ]);
  });

  test('parses move headers and EOF hunks', () => {
    const patch = wrap(`*** Update File: old.ts
*** Move to: new.ts
@@
 line one
-line two
+line updated
*** End of File`);

    expect(parsePatch(patch).hunks).toEqual([
      {
        type: 'update',
        path: 'old.ts',
        move_path: 'new.ts',
        chunks: [{
          old_lines: ['line one', 'line two'],
          new_lines: ['line one', 'line updated'],
          is_end_of_file: true,
        }],
      },
    ]);
  });

  test('merges multiple update sections for the same path', () => {
    const patch = wrap(`*** Update File: src/a.ts
@@
-const a = 1;
+const a = 2;
*** Update File: src/a.ts
@@
-const b = 3;
+const b = 4;`);

    expect(parsePatch(patch).hunks).toEqual([
      {
        type: 'update',
        path: 'src/a.ts',
        chunks: [
          { old_lines: ['const a = 1;'], new_lines: ['const a = 2;'] },
          { old_lines: ['const b = 3;'], new_lines: ['const b = 4;'] },
        ],
      },
    ]);
  });

  test('preserves first-seen path order when merging updates', () => {
    const patch = wrap(`*** Update File: b.ts
@@
-old
+new
*** Add File: a.txt
+created
*** Update File: b.ts
@@
-other
+changed`);

    expect(parsePatch(patch).hunks.map((hunk) => hunk.path)).toEqual(['b.ts', 'a.txt']);
  });
});

describe('normalizeHunks', () => {
  test('rejects duplicate add operations for the same path', () => {
    expect(() => normalizeHunks([
      { type: 'add', path: 'a.txt', contents: 'one' },
      { type: 'add', path: 'a.txt', contents: 'two' },
    ])).toThrow('duplicate patch operation for a.txt');
  });

  test('rejects conflicting move targets when merging updates', () => {
    expect(() => normalizeHunks([
      { type: 'update', path: 'a.ts', move_path: 'b.ts', chunks: [] },
      { type: 'update', path: 'a.ts', move_path: 'c.ts', chunks: [] },
    ])).toThrow('conflicting move targets for a.ts');
  });

  test('rejects mixed operations for the same path', () => {
    expect(() => normalizeHunks([
      { type: 'add', path: 'a.txt', contents: 'hi' },
      { type: 'update', path: 'a.txt', chunks: [] },
    ])).toThrow('duplicate patch operation for a.txt');
  });
});

describe('deriveNewContentsFromChunks', () => {
  test('applies a simple replacement', () => {
    const result = deriveNewContentsFromChunks('a.ts', [{
      old_lines: ['const x = 1;'],
      new_lines: ['const x = 2;'],
    }], 'const x = 1;\n');

    expect(result).toBe('const x = 2;\n');
  });

  test('applies multiple chunks sequentially', () => {
    const original = ['const a = 1;', 'const b = 2;', 'const c = 3;'].join('\n') + '\n';
    const result = deriveNewContentsFromChunks('a.ts', [
      { old_lines: ['const a = 1;'], new_lines: ['const a = 9;'] },
      { old_lines: ['const c = 3;'], new_lines: ['const c = 7;'] },
    ], original);

    expect(result).toBe(['const a = 9;', 'const b = 2;', 'const c = 7;'].join('\n') + '\n');
  });

  test('uses @@ context lines to disambiguate matches', () => {
    const original = ['alpha', 'target', 'beta', 'target', 'gamma'].join('\n') + '\n';
    const result = deriveNewContentsFromChunks('a.ts', [{
      change_context: 'beta',
      old_lines: ['target'],
      new_lines: ['updated'],
    }], original);

    expect(result).toBe(['alpha', 'target', 'beta', 'updated', 'gamma'].join('\n') + '\n');
  });

  test('matches EOF hunks from the end of the file', () => {
    const original = ['keep', 'old tail'].join('\n') + '\n';
    const result = deriveNewContentsFromChunks('a.ts', [{
      old_lines: ['old tail'],
      new_lines: ['new tail'],
      is_end_of_file: true,
    }], original);

    expect(result).toBe(['keep', 'new tail'].join('\n') + '\n');
  });

  test('falls back to trimmed line matching', () => {
    const original = '  const x = 1;  \n';
    const result = deriveNewContentsFromChunks('a.ts', [{
      old_lines: ['const x = 1;'],
      new_lines: ['const x = 2;'],
    }], original);

    expect(result).toBe('const x = 2;\n');
  });

  test('throws when expected lines are missing', () => {
    expect(() => deriveNewContentsFromChunks('a.ts', [{
      old_lines: ['missing line'],
      new_lines: ['replacement'],
    }], 'const x = 1;\n')).toThrow('Failed to find expected lines in a.ts');
  });
});
