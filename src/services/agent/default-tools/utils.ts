import { join, resolve, isAbsolute } from 'node:path';
import { stat } from 'node:fs/promises';

export const DEFAULT_TOOL_SERVER = 'default';

export const MAX_OUTPUT_LINES = 2000;
export const MAX_OUTPUT_BYTES = 30_000;

export const getWorkspaceDir = () => process.cwd();

export const resolveWorkspacePath = (filePath: string) =>
  isAbsolute(filePath) ? resolve(filePath) : resolve(getWorkspaceDir(), filePath);

export const assertWithinWorkspace = async (filePath: string) => {
  const resolved = resolveWorkspacePath(filePath);
  const workspace = resolve(getWorkspaceDir());
  if (!resolved.startsWith(workspace)) {
    throw new Error(`Path is outside the workspace: ${filePath}`);
  }
  return resolved;
};

export const pathExists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

export const truncateOutput = (text: string, maxLines = MAX_OUTPUT_LINES, maxBytes = MAX_OUTPUT_BYTES) => {
  const lines = text.split('\n');
  let truncated = false;
  let output = text;

  if (lines.length > maxLines) {
    output = lines.slice(0, maxLines).join('\n');
    truncated = true;
  }

  if (Buffer.byteLength(output, 'utf-8') > maxBytes) {
    let size = 0;
    const kept: string[] = [];
    for (const line of output.split('\n')) {
      const lineSize = Buffer.byteLength(line, 'utf-8') + 1;
      if (size + lineSize > maxBytes) break;
      kept.push(line);
      size += lineSize;
    }
    output = kept.join('\n');
    truncated = true;
  }

  if (truncated) {
    output += `\n\n(Output truncated to ${maxLines} lines / ${maxBytes} bytes.)`;
  }

  return output;
};

export const formatLineNumbered = (content: string, offset: number) =>
  content.split('\n').map((line, index) => {
    const truncated = line.length > 2000 ? `${line.slice(0, 2000)}... (line truncated to 2000 chars)` : line;
    return `${offset + index}: ${truncated}`;
  }).join('\n');

export const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export const mimeFromExtension = (filePath: string) => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return undefined;
  }
};

export const joinPath = join;
