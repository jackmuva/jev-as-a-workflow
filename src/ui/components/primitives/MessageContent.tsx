import type { ModelMessage } from "ai"
import { renderToolCall, renderToolResult } from "../../tool-renderers"
import {
  formatToolResultText,
  isToolResultError,
  type ToolCallPart,
  type ToolResultPart,
} from "../../lib/format"
import { AGENT_BORDER_COLOR } from "./ToolFrame"

const formatMessageContent = (message: ModelMessage): string => {
  if (typeof message.content === "string") return message.content

  const parts: string[] = []
  for (const part of message.content) {
    switch (part.type) {
      case "text":
      case "reasoning":
        parts.push(part.text)
        break
      case "image":
        parts.push("[image]")
        break
      case "file":
        if (part.mediaType.startsWith("image")) {
          parts.push(`[image: ${part.filename ?? part.mediaType}]`)
        } else {
          parts.push(`[file: ${part.filename ?? part.mediaType}]`)
        }
        break
      case "tool-call":
      case "tool-result":
        break
      default:
        parts.push(`[${part.type}]`)
    }
  }
  return parts.join("")
}

const hasOnlyToolCalls = (message: ModelMessage): boolean => {
  if (message.role !== "assistant" || !Array.isArray(message.content)) return false
  return message.content.length > 0 && message.content.every((part) => part.type === "tool-call")
}

type MessageContentProps = {
  message: ModelMessage
  toolCallInputs: Map<string, { toolName: string; input: unknown }>
}

export const MessageContent = ({ message, toolCallInputs }: MessageContentProps) => {
  const isAgent = message.role === "assistant" || message.role === "tool"

  if (message.role === "tool" && Array.isArray(message.content)) {
    return (
      <>
        {message.content.map((part, index) => {
          if (part.type !== "tool-result") return null
          const toolResult = part as ToolResultPart

          if (toolResult.toolName.endsWith("/message_answer")) {
            return (
              <box
                key={toolResult.toolCallId ?? index}
                border={["left"]}
                borderColor={AGENT_BORDER_COLOR}
                paddingLeft={1}
                marginBottom={1}
                width="100%"
              >
                <text>{formatToolResultText(toolResult)}</text>
              </box>
            )
          }

          if (toolResult.toolName === "AskQuestion") {
            return (
              <box
                key={toolResult.toolCallId ?? index}
                border={["left"]}
                borderColor={AGENT_BORDER_COLOR}
                paddingLeft={1}
                marginBottom={1}
                width="100%"
              >
                <text fg={AGENT_BORDER_COLOR}>Your answers</text>
                <text>{formatToolResultText(toolResult)}</text>
              </box>
            )
          }

          const matchedCall = toolCallInputs.get(toolResult.toolCallId)
          return (
            <box key={toolResult.toolCallId ?? index}>
              {renderToolResult({
                toolName: toolResult.toolName,
                toolCallId: toolResult.toolCallId,
                input: matchedCall?.input,
                output: toolResult.output,
                text: formatToolResultText(toolResult),
                isError: isToolResultError(toolResult),
              })}
            </box>
          )
        })}
      </>
    )
  }

  if (hasOnlyToolCalls(message) && Array.isArray(message.content)) {
    return (
      <>
        {message.content.map((part, index) => {
          if (part.type !== "tool-call") return null
          const toolCall = part as ToolCallPart

          if (toolCall.toolName === "AskQuestion") {
            return null
          }

          return (
            <box key={toolCall.toolCallId ?? index}>
              {renderToolCall({
                toolName: toolCall.toolName,
                toolCallId: toolCall.toolCallId,
                input: toolCall.input,
                text: "",
              })}
            </box>
          )
        })}
      </>
    )
  }

  const text = formatMessageContent(message)
  if (!text) return null

  return (
    <box
      border={isAgent ? ["left"] : false}
      borderColor={isAgent ? AGENT_BORDER_COLOR : undefined}
      paddingLeft={isAgent ? 1 : 0}
      marginBottom={1}
      width="100%"
    >
      <text>{text}</text>
    </box>
  )
}
