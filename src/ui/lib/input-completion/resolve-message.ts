import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { ModelMessage } from "ai"

const FILE_REFERENCE_PATTERN = /@([^\s@]+)/g
const MAX_ATTACHMENT_BYTES = 32_000

type FileAttachment = {
  path: string
  content: string
}

const readAttachment = async (path: string, root = process.cwd()): Promise<FileAttachment | null> => {
  const absolutePath = join(root, path)
  try {
    const content = await readFile(absolutePath, "utf8")
    if (content.length > MAX_ATTACHMENT_BYTES) {
      return {
        path,
        content: `${content.slice(0, MAX_ATTACHMENT_BYTES)}\n\n[Truncated: file exceeds ${MAX_ATTACHMENT_BYTES} characters]`,
      }
    }
    return { path, content }
  } catch {
    return null
  }
}

export const extractFileReferences = (text: string): string[] => {
  const references = new Set<string>()
  for (const match of text.matchAll(FILE_REFERENCE_PATTERN)) {
    const path = match[1]
    if (path) references.add(path)
  }
  return [...references]
}

export const resolveUserMessage = async (text: string): Promise<ModelMessage> => {
  const references = extractFileReferences(text)
  if (references.length === 0) {
    return { role: "user", content: text }
  }

  const attachments = (
    await Promise.all(references.map((path) => readAttachment(path)))
  ).filter((attachment): attachment is FileAttachment => attachment !== null)

  if (attachments.length === 0) {
    return { role: "user", content: text }
  }

  const attachmentText = attachments
    .map((attachment) => `[Attached: ${attachment.path}]\n${attachment.content}`)
    .join("\n\n")

  return {
    role: "user",
    content: `${text}\n\n${attachmentText}`,
  }
}
