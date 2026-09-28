import type { CompletionItem, SlashCommandDefinition } from "../../../models/ui"

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    name: "clear",
    description: "Clear the saved conversation for this workspace",
  },
  {
    name: "resume",
    description: "Reload the saved conversation from SQLite",
  },
]

export type SlashCommandActions = {
  clearSession: () => void
  resumeSession: () => void
}

export type SlashCommandHandlers = SlashCommandActions & {
  clearInput: () => void
}

export const getSlashCompletions = (query: string): CompletionItem[] =>
  SLASH_COMMANDS
    .filter((command) => command.name.startsWith(query.toLowerCase()))
    .map((command) => ({
      id: `slash:${command.name}`,
      label: `/${command.name}`,
      description: command.description,
      insertText: `/${command.name}`,
      value: command,
    }))

export const findSlashCommand = (text: string): SlashCommandDefinition | null => {
  const trimmed = text.trim()
  if (!trimmed.startsWith("/")) return null

  const name = trimmed.slice(1).split(/\s+/)[0]?.toLowerCase()
  if (!name) return null

  return SLASH_COMMANDS.find((command) => command.name === name) ?? null
}

export const executeSlashCommand = (
  name: string,
  handlers: SlashCommandHandlers,
): boolean => {
  switch (name) {
    case "clear":
      handlers.clearSession()
      handlers.clearInput()
      return true
    case "resume":
      handlers.resumeSession()
      handlers.clearInput()
      return true
    default:
      return false
  }
}
