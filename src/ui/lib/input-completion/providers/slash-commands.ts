import type { CompletionItem, SlashCommand } from "../types"

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "clear",
    description: "Clear the input",
    handler: ({ clearInput }) => clearInput(),
  },
]

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

export const findSlashCommand = (text: string): SlashCommand | null => {
  const trimmed = text.trim()
  if (!trimmed.startsWith("/")) return null

  const name = trimmed.slice(1).split(/\s+/)[0]?.toLowerCase()
  if (!name) return null

  return SLASH_COMMANDS.find((command) => command.name === name) ?? null
}
