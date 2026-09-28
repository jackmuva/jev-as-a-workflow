import { getAtFileCompletions } from "./providers/at-files"
import { getSlashCompletions } from "./providers/slash-commands"
import type { ActiveTrigger, CompletionItem } from "./types"

export const getCompletions = async (trigger: ActiveTrigger): Promise<CompletionItem[]> => {
  if (trigger.kind === "at") {
    return getAtFileCompletions(trigger.query)
  }

  return getSlashCompletions(trigger.query)
}
