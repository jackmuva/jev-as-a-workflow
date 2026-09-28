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
