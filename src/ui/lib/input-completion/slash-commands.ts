import type { CompletionItem, SlashCommandDefinition } from "../../../models/ui"
import { fuzzyContains, fuzzyScore } from "./fuzzy-match"

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    name: "clear",
    description: "Clear the saved conversation for this workspace",
  },
  {
    name: "resume",
    description: "Choose a saved session to resume",
  },
  {
    name: "configure",
    description: "Choose which MCPs, skills, tools, and AGENTS.md to enable",
  },
  {
    name: "generate",
    description: "Create a workflow from a saved session",
  },
  {
    name: "workflow",
    description: "Run a saved workflow with additional instructions",
  },
]

export type SlashCommandActions = {
  clearSession: () => void
  resumeSession: () => void
  configureCapabilities: () => void
  generateWorkflow: () => void
  runWorkflow: () => void
}

export type SlashCommandHandlers = SlashCommandActions & {
  clearInput: () => void
}

export const getSlashCompletions = (query: string): CompletionItem[] => {
  let matches = SLASH_COMMANDS.filter((command) => fuzzyContains(command.name, query))
  const hasPrefixMatch = matches.some((command) => fuzzyScore(command.name, query) === 0)
  if (hasPrefixMatch) {
    matches = matches.filter((command) => fuzzyScore(command.name, query) === 0)
  } else {
    const hasSubstringMatch = matches.some((command) => fuzzyScore(command.name, query) === 1)
    if (hasSubstringMatch) {
      matches = matches.filter((command) => fuzzyScore(command.name, query) === 1)
    }
  }
  matches.sort((left, right) => {
    const scoreA = fuzzyScore(left.name, query)
    const scoreB = fuzzyScore(right.name, query)
    if (scoreA !== scoreB) return scoreA - scoreB
    return left.name.localeCompare(right.name)
  })

  return matches.map((command) => ({
    id: `slash:${command.name}`,
    label: `/${command.name}`,
    description: command.description,
    insertText: `/${command.name}`,
    value: command,
  }))
}

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
    case "configure":
      handlers.configureCapabilities()
      handlers.clearInput()
      return true
    case "generate":
      handlers.generateWorkflow()
      handlers.clearInput()
      return true
    case "workflow":
      handlers.runWorkflow()
      handlers.clearInput()
      return true
    default:
      return false
  }
}
