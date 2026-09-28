import type { ToolResultPart } from "../ui/lib/format/format"

export type ToolRenderContext = {
  toolName: string
  toolCallId?: string
  input?: unknown
  output?: ToolResultPart["output"]
  text: string
  isError?: boolean
}

export type ToolViewProps = ToolRenderContext

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

export type SlashCommandDefinition = {
  name: string
  description: string
}
