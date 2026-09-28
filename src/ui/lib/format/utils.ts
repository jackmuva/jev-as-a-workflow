const EXT_TO_FILETYPE: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  md: "markdown",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  html: "html",
  css: "css",
  scss: "scss",
  sql: "sql",
  toml: "toml",
  xml: "xml",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  rb: "ruby",
  php: "php",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  vue: "vue",
  svelte: "svelte",
}

export const filetypeFromPath = (filePath?: string): string | undefined => {
  if (!filePath) return undefined
  const ext = filePath.split(".").pop()?.toLowerCase()
  if (!ext) return undefined
  return EXT_TO_FILETYPE[ext]
}

export type ParsedLineNumberedContent = {
  content: string
  startLine: number
}

export const parseLineNumberedContent = (text: string): ParsedLineNumberedContent => {
  const lines = text.split("\n")
  const parsedLines: string[] = []
  let startLine = 1

  for (const line of lines) {
    const match = line.match(/^(\d+):\s(.*)$/)
    if (!match) {
      parsedLines.push(line)
      continue
    }

    const lineNumber = Number(match[1])
    if (parsedLines.length === 0) startLine = lineNumber
    parsedLines.push(match[2] ?? "")
  }

  return {
    content: parsedLines.join("\n"),
    startLine,
  }
}

export const looksLikeLineNumberedOutput = (text: string): boolean =>
  /^\d+:\s/.test(text.trim())

export const looksLikeMarkdown = (text: string): boolean =>
  /(^|\n)(#{1,6}\s|[-*]\s|\d+\.\s|```|\[.+\]\(.+\))/.test(text)

export const buildUnifiedDiff = (
  filePath: string,
  oldText: string,
  newText: string,
): string => {
  const oldLines = oldText.split("\n")
  const newLines = newText.split("\n")
  const header = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -1,${Math.max(oldLines.length, 1)} +1,${Math.max(newLines.length, 1)} @@`,
  ]

  const body: string[] = []
  for (const line of oldLines) body.push(`-${line}`)
  for (const line of newLines) body.push(`+${line}`)

  return [...header, ...body].join("\n")
}

export const buildWriteDiff = (filePath: string, content: string): string =>
  buildUnifiedDiff(filePath, "", content)

export const asRecord = (input: unknown): Record<string, unknown> | undefined =>
  input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : undefined

export const readStringField = (input: unknown, key: string): string | undefined => {
  const record = asRecord(input)
  const value = record?.[key]
  return typeof value === "string" ? value : undefined
}

export const readNumberField = (input: unknown, key: string, fallback: number): number => {
  const record = asRecord(input)
  const value = record?.[key]
  return typeof value === "number" ? value : fallback
}

export const callTitle = (toolName: string) => `▶ ${toolName}`
