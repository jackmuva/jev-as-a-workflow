export type Hunk =
  | { type: 'add'; path: string; contents: string }
  | { type: 'delete'; path: string }
  | { type: 'update'; path: string; move_path?: string; chunks: UpdateFileChunk[] };

export type UpdateFileChunk = {
  old_lines: string[];
  new_lines: string[];
  change_context?: string;
  is_end_of_file?: boolean;
};

const BEGIN_PATCH = '*** Begin Patch';
const END_PATCH = '*** End Patch';

function parsePatchHeader(
  lines: string[],
  startIdx: number,
): { filePath: string; movePath?: string; nextIdx: number } {
  const line = lines[startIdx];
  if (!line) {
    throw new Error('Invalid patch format: expected file operation header');
  }

  if (line.startsWith('*** Add File:')) {
    const filePath = line.slice('*** Add File:'.length).trim();
    if (!filePath) {
      throw new Error(`Invalid patch format: missing file path in header: ${line}`);
    }
    return { filePath, nextIdx: startIdx + 1 };
  }

  if (line.startsWith('*** Delete File:')) {
    const filePath = line.slice('*** Delete File:'.length).trim();
    if (!filePath) {
      throw new Error(`Invalid patch format: missing file path in header: ${line}`);
    }
    return { filePath, nextIdx: startIdx + 1 };
  }

  if (line.startsWith('*** Update File:')) {
    const filePath = line.slice('*** Update File:'.length).trim();
    if (!filePath) {
      throw new Error(`Invalid patch format: missing file path in header: ${line}`);
    }

    let movePath: string | undefined;
    let nextIdx = startIdx + 1;

    const moveLine = lines[nextIdx];
    if (moveLine?.startsWith('*** Move to:')) {
      movePath = moveLine.slice('*** Move to:'.length).trim();
      if (!movePath) {
        throw new Error(`Invalid patch format: missing move target in header: ${moveLine}`);
      }
      nextIdx++;
    }

    return { filePath, movePath, nextIdx };
  }

  throw new Error(`Invalid patch format: expected file operation header, got: ${line}`);
}

function parseUpdateFileChunks(lines: string[], startIdx: number, endIdx: number): { chunks: UpdateFileChunk[]; nextIdx: number } {
  const chunks: UpdateFileChunk[] = [];
  let i = startIdx;

  while (i < endIdx) {
    const current = lines[i];
    if (!current || current.startsWith('***')) break;

    if (current.trim() === '') {
      i++;
      continue;
    }

    if (!current.startsWith('@@')) {
      throw new Error(`Invalid patch format: expected hunk marker @@, got: ${current}`);
    }

    const contextLine = current.substring(2).trim();
    i++;

    const oldLines: string[] = [];
    const newLines: string[] = [];
    let isEndOfFile = false;

    while (i < endIdx) {
      const changeLine = lines[i];
      if (!changeLine || changeLine.startsWith('@@')) break;

      if (changeLine.startsWith('***')) {
        if (changeLine === '*** End of File') {
          isEndOfFile = true;
          i++;
        }
        break;
      }

      if (changeLine.trim() === '') {
        throw new Error('Invalid patch format: hunk lines must start with space, -, or +');
      }

      if (changeLine.startsWith(' ')) {
        const content = changeLine.substring(1);
        oldLines.push(content);
        newLines.push(content);
      } else if (changeLine.startsWith('-')) {
        oldLines.push(changeLine.substring(1));
      } else if (changeLine.startsWith('+')) {
        newLines.push(changeLine.substring(1));
      } else {
        throw new Error(`Invalid patch format: hunk lines must start with space, -, or +, got: ${changeLine}`);
      }

      i++;
    }

    chunks.push({
      old_lines: oldLines,
      new_lines: newLines,
      change_context: contextLine || undefined,
      is_end_of_file: isEndOfFile || undefined,
    });
  }

  return { chunks, nextIdx: i };
}

function parseAddFileContent(lines: string[], startIdx: number, endIdx: number): { content: string; nextIdx: number } {
  let content = '';
  let i = startIdx;

  while (i < endIdx) {
    const line = lines[i];
    if (!line || line.startsWith('***')) break;

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (!line.startsWith('+')) {
      throw new Error(`Invalid patch format: add file content lines must start with '+', got: ${line}`);
    }

    content += `${line.substring(1)}\n`;
    i++;
  }

  if (content.endsWith('\n')) content = content.slice(0, -1);
  return { content, nextIdx: i };
}

function stripHeredoc(input: string): string {
  const heredocMatch = input.match(/^(?:cat\s+)?<<['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\1\s*$/);
  return heredocMatch?.[2] ?? input;
}

function normalizePatchLines(patchText: string): string[] {
  const cleaned = stripHeredoc(patchText.trim());
  const normalized = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized.split('\n');
}

export function normalizeHunks(hunks: Hunk[]): Hunk[] {
  const pathOps = new Map<string, Hunk>();

  for (const hunk of hunks) {
    const existing = pathOps.get(hunk.path);

    if (!existing) {
      pathOps.set(
        hunk.path,
        hunk.type === 'update' ? { ...hunk, chunks: [...hunk.chunks] } : hunk,
      );
      continue;
    }

    if (hunk.type === 'update' && existing.type === 'update') {
      if (hunk.move_path && existing.move_path && hunk.move_path !== existing.move_path) {
        throw new Error(
          `Invalid patch format: conflicting move targets for ${hunk.path}: ` +
          `'${existing.move_path}' and '${hunk.move_path}'`,
        );
      }

      pathOps.set(hunk.path, {
        type: 'update',
        path: existing.path,
        move_path: hunk.move_path ?? existing.move_path,
        chunks: [...existing.chunks, ...hunk.chunks],
      });
      continue;
    }

    throw new Error(
      `Invalid patch format: duplicate patch operation for ${hunk.path}: ` +
      `cannot ${hunk.type} after ${existing.type}`,
    );
  }

  const seen = new Set<string>();
  const ordered: Hunk[] = [];
  for (const hunk of hunks) {
    if (seen.has(hunk.path)) continue;
    seen.add(hunk.path);
    const merged = pathOps.get(hunk.path);
    if (merged) ordered.push(merged);
  }

  return ordered;
}

export function parsePatch(patchText: string): { hunks: Hunk[] } {
  const lines = normalizePatchLines(patchText);

  if (lines.length < 2) {
    throw new Error('Invalid patch format: patch must include Begin and End markers');
  }

  if (lines[0]?.trim() !== BEGIN_PATCH) {
    throw new Error("Invalid patch format: patch must start with '*** Begin Patch'");
  }

  if (lines[lines.length - 1]?.trim() !== END_PATCH) {
    throw new Error("Invalid patch format: patch must end with '*** End Patch'");
  }

  const endIdx = lines.length - 1;
  const rawHunks: Hunk[] = [];
  let i = 1;

  while (i < endIdx) {
    const current = lines[i];
    if (!current || current.trim() === '') {
      i++;
      continue;
    }

    const header = parsePatchHeader(lines, i);

    if (current.startsWith('*** Add File:')) {
      const { content, nextIdx } = parseAddFileContent(lines, header.nextIdx, endIdx);
      rawHunks.push({ type: 'add', path: header.filePath, contents: content });
      i = nextIdx;
    } else if (current.startsWith('*** Delete File:')) {
      rawHunks.push({ type: 'delete', path: header.filePath });
      i = header.nextIdx;
    } else if (current.startsWith('*** Update File:')) {
      const { chunks, nextIdx } = parseUpdateFileChunks(lines, header.nextIdx, endIdx);
      rawHunks.push({
        type: 'update',
        path: header.filePath,
        move_path: header.movePath,
        chunks,
      });
      i = nextIdx;
    } else {
      throw new Error(`Invalid patch format: expected file operation header, got: ${current}`);
    }
  }

  if (rawHunks.length === 0) {
    throw new Error('Invalid patch format: patch must include at least one file operation');
  }

  return { hunks: normalizeHunks(rawHunks) };
}

export function deriveNewContentsFromChunks(
  filePath: string,
  chunks: UpdateFileChunk[],
  originalText: string,
): string {
  let originalLines = originalText.split('\n');

  if (originalLines.length > 0 && originalLines[originalLines.length - 1] === '') {
    originalLines.pop();
  }

  const replacements = computeReplacements(originalLines, filePath, chunks);
  let newLines = applyReplacements(originalLines, replacements);

  if (newLines.length === 0 || newLines[newLines.length - 1] !== '') {
    newLines.push('');
  }

  return newLines.join('\n');
}

function computeReplacements(
  originalLines: string[],
  filePath: string,
  chunks: UpdateFileChunk[],
): Array<[number, number, string[]]> {
  const replacements: Array<[number, number, string[]]> = [];
  let lineIndex = 0;

  for (const chunk of chunks) {
    if (chunk.change_context) {
      const contextIdx = seekSequence(originalLines, [chunk.change_context], lineIndex);
      if (contextIdx === -1) {
        throw new Error(`Failed to find context '${chunk.change_context}' in ${filePath}`);
      }
      lineIndex = contextIdx + 1;
    }

    if (chunk.old_lines.length === 0) {
      const insertionIdx =
        originalLines.length > 0 && originalLines[originalLines.length - 1] === ''
          ? originalLines.length - 1
          : originalLines.length;
      replacements.push([insertionIdx, 0, chunk.new_lines]);
      continue;
    }

    let pattern = chunk.old_lines;
    let newSlice = chunk.new_lines;
    let found = seekSequence(originalLines, pattern, lineIndex, chunk.is_end_of_file);

    if (found === -1 && pattern.length > 0 && pattern[pattern.length - 1] === '') {
      pattern = pattern.slice(0, -1);
      if (newSlice.length > 0 && newSlice[newSlice.length - 1] === '') {
        newSlice = newSlice.slice(0, -1);
      }
      found = seekSequence(originalLines, pattern, lineIndex, chunk.is_end_of_file);
    }

    if (found !== -1) {
      replacements.push([found, pattern.length, newSlice]);
      lineIndex = found + pattern.length;
    } else {
      throw new Error(`Failed to find expected lines in ${filePath}:\n${chunk.old_lines.join('\n')}`);
    }
  }

  replacements.sort((a, b) => a[0] - b[0]);
  return replacements;
}

function applyReplacements(lines: string[], replacements: Array<[number, number, string[]]>): string[] {
  const result = [...lines];

  for (let i = replacements.length - 1; i >= 0; i--) {
    const [startIdx, oldLen, newSegment] = replacements[i]!;
    result.splice(startIdx, oldLen);
    for (let j = 0; j < newSegment.length; j++) {
      result.splice(startIdx + j, 0, newSegment[j]!);
    }
  }

  return result;
}

function normalizeUnicode(str: string): string {
  return str
    .replace(/[''‚‛]/g, "'")
    .replace(/[""„‟]/g, '"')
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/…/g, '...')
    .replace(/\u00a0/g, ' ');
}

type Comparator = (a: string, b: string) => boolean;

function tryMatch(
  lines: string[],
  pattern: string[],
  startIndex: number,
  compare: Comparator,
  eof: boolean,
): number {
  if (eof) {
    const fromEnd = lines.length - pattern.length;
    if (fromEnd >= startIndex) {
      let matches = true;
      for (let j = 0; j < pattern.length; j++) {
        if (!compare(lines[fromEnd + j]!, pattern[j]!)) {
          matches = false;
          break;
        }
      }
      if (matches) return fromEnd;
    }
  }

  for (let i = startIndex; i <= lines.length - pattern.length; i++) {
    let matches = true;
    for (let j = 0; j < pattern.length; j++) {
      if (!compare(lines[i + j]!, pattern[j]!)) {
        matches = false;
        break;
      }
    }
    if (matches) return i;
  }

  return -1;
}

function seekSequence(lines: string[], pattern: string[], startIndex: number, eof = false): number {
  if (pattern.length === 0) return -1;

  const exact = tryMatch(lines, pattern, startIndex, (a, b) => a === b, eof);
  if (exact !== -1) return exact;

  const rstrip = tryMatch(lines, pattern, startIndex, (a, b) => a.trimEnd() === b.trimEnd(), eof);
  if (rstrip !== -1) return rstrip;

  const trim = tryMatch(lines, pattern, startIndex, (a, b) => a.trim() === b.trim(), eof);
  if (trim !== -1) return trim;

  return tryMatch(
    lines,
    pattern,
    startIndex,
    (a, b) => normalizeUnicode(a.trim()) === normalizeUnicode(b.trim()),
    eof,
  );
}
