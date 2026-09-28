import type { ModelMessage } from "ai"

export type ToolResultPart = Extract<
  NonNullable<ModelMessage["content"]>[number],
  { type: "tool-result" }
>

export type ToolCallPart = Extract<
  NonNullable<ModelMessage["content"]>[number],
  { type: "tool-call" }
>

export const formatToolResultText = (part: ToolResultPart): string => {
  if ("value" in part.output) {
    const value = part.output.value
    if (typeof value === "string") return value
    return JSON.stringify(value, null, 2)
  }
  return `[${part.output.type}]`
}

export const isToolResultError = (part: ToolResultPart): boolean =>
  part.output.type === "error-text"

export const buildToolCallInputMap = (messages: ModelMessage[]): Map<string, { toolName: string; input: unknown }> => {
  const map = new Map<string, { toolName: string; input: unknown }>()

  for (const message of messages) {
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue
    for (const part of message.content) {
      if (part.type !== "tool-call") continue
      map.set(part.toolCallId, { toolName: part.toolName, input: part.input })
    }
  }

  return map
}
