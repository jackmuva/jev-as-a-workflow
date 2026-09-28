export type CompletionKind = "at" | "slash"

export type CompletionItem = {
  id: string
  label: string
  description?: string
  insertText: string
  value: unknown
}

export type ActiveTrigger = {
  kind: CompletionKind
  startOffset: number
  query: string
  endOffset: number
}

export type CompletionState =
  | { open: false }
  | {
      open: true
      trigger: ActiveTrigger
      items: CompletionItem[]
      selectedIndex: number
    }

export type SlashCommandHandler = (context: { clearInput: () => void }) => void

export type SlashCommand = {
  name: string
  description: string
  handler?: SlashCommandHandler
}
