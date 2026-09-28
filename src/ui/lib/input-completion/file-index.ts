import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"

const EXCLUDED_DIRS = new Set(["node_modules", ".git", "dist", ".cache"])

let cachedFiles: string[] | null = null
let cachedRoot: string | null = null

const walkDirectory = async (dir: string, root: string, files: string[]): Promise<void> => {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue

    const absolutePath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkDirectory(absolutePath, root, files)
      continue
    }

    if (entry.isFile()) {
      files.push(relative(root, absolutePath))
    }
  }
}

export const listWorkspaceFiles = async (root = process.cwd()): Promise<string[]> => {
  if (cachedFiles && cachedRoot === root) return cachedFiles

  const files: string[] = []
  await walkDirectory(root, root, files)
  files.sort()

  cachedFiles = files
  cachedRoot = root
  return files
}

export const invalidateFileIndex = () => {
  cachedFiles = null
  cachedRoot = null
}

export const filterFiles = (files: string[], query: string, limit = 15): string[] => {
  const normalized = query.toLowerCase()
  const matches = files.filter((file) => file.toLowerCase().includes(normalized))
  matches.sort((left, right) => scoreFileMatch(left, normalized) - scoreFileMatch(right, normalized))
  return matches.slice(0, limit)
}

const scoreFileMatch = (file: string, query: string): number => {
  const lower = file.toLowerCase()
  if (lower.startsWith(query)) return 0
  if (lower.includes(`/${query}`)) return 1
  const basename = lower.split("/").pop() ?? lower
  if (basename.startsWith(query)) return 2
  return 3
}
