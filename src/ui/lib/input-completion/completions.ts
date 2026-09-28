import type { ActiveTrigger, CompletionKind, CompletionItem } from "../../../models/ui"
import { getAtFileCompletions } from "./at-files"
import { getSlashCompletions } from "./slash-commands"

const isBoundary = (char: string | undefined) => char === undefined || /\s/.test(char)

export const detectTrigger = (text: string, cursor: number): ActiveTrigger | null => {
  if (cursor < 0 || cursor > text.length) return null

  let index = cursor - 1
  while (index >= 0 && !/\s/.test(text[index]!)) {
    const char = text[index]!
    if (char === "@" || char === "/") {
      if (!isBoundary(text[index - 1])) return null

      const kind: CompletionKind = char === "@" ? "at" : "slash"
      return {
        kind,
        startOffset: index,
        query: text.slice(index + 1, cursor),
        endOffset: cursor,
      }
    }
    index -= 1
  }

  return null
}


export const getCompletions = async (trigger: ActiveTrigger): Promise<CompletionItem[]> => {
  if (trigger.kind === "at") {
    return getAtFileCompletions(trigger.query)
  }

  return getSlashCompletions(trigger.query)
}
