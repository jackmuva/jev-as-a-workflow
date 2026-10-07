import type { ModelMessage } from "ai"
import type { JevMessage } from "../../../models/agent"

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

export const buildToolCallInputMap = (messages: JevMessage[]): Map<string, { toolName: string; input: unknown }> => {
  const map = new Map<string, { toolName: string; input: unknown }>()

  for (const { message } of messages) {
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue
    for (const part of message.content) {
      if (part.type !== "tool-call") continue
      map.set(part.toolCallId, { toolName: part.toolName, input: part.input })
    }
  }

  return map
}

export const formatSessionCostUsd = (usd: number): string => {
  if (!Number.isFinite(usd) || usd <= 0) return "$0.00"
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

export const formatSessionTokens = (tokens: number): string => {
  if (!Number.isFinite(tokens) || tokens <= 0) return "0 tok"
  if (tokens < 10_000) return `${tokens.toLocaleString("en-US")} tok`
  if (tokens < 1_000_000) {
    const compact = tokens / 1000
    return `${compact >= 100 ? Math.round(compact) : compact.toFixed(1)}k tok`
  }
  return `${(tokens / 1_000_000).toFixed(2)}M tok`
}
