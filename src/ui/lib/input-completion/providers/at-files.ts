import { filterFiles, listWorkspaceFiles } from "../file-index"
import type { CompletionItem } from "../types"

export const getAtFileCompletions = async (query: string): Promise<CompletionItem[]> => {
  const files = await listWorkspaceFiles()
  return filterFiles(files, query).map((path) => ({
    id: `file:${path}`,
    label: path,
    description: "File",
    insertText: `@${path} `,
    value: path,
  }))
}
