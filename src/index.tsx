import { createCliRenderer, type KeyBinding, type TextareaRenderable } from "@opentui/core"
import { createRoot, useTerminalDimensions } from "@opentui/react"
import { useMemo, useState, useRef } from "react";
import { jevLoop } from "./services/agent/agent-loop";
import { frontLoadMessages } from "./services/agent/hooks/front-load";
import type { ModelMessage } from "ai";
import { mcpClient } from "./services/mcp/mcp-client";
import { renderToolCall, renderToolResult } from "./ui/tool-renderers";
import {
  buildToolCallInputMap,
  formatToolResultText,
  isToolResultError,
  type ToolCallPart,
  type ToolResultPart,
} from "./ui/tool-views/format";
import { AGENT_BORDER_COLOR } from "./ui/tool-views/ToolFrame";

const chatKeyBindings: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "kpenter", action: "submit" },
  { name: "kpenter", shift: true, action: "newline" },
  { name: "linefeed", action: "submit" },
  { name: "linefeed", shift: true, action: "newline" },
]

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

const MessageContent = ({
  message,
  toolCallInputs,
}: {
  message: ModelMessage
  toolCallInputs: Map<string, { toolName: string; input: unknown }>
}) => {
  const isAgent = message.role === "assistant" || message.role === "tool"

  if (message.role === "tool" && Array.isArray(message.content)) {
    return (
      <>
        {message.content.map((part, index) => {
          if (part.type !== "tool-result") return null
          const toolResult = part as ToolResultPart
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

function App(props: { initialMessage?: string | null; seedMessages: ModelMessage[] }) {
  const [messages, setMessages] = useState<ModelMessage[]>(props.seedMessages);
  const [status, setStatus] = useState<"ready" | "working" | "error">("ready")
  const textareaRef = useRef<TextareaRenderable>(null)
  const { height } = useTerminalDimensions()

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages],
  )

  const toolCallInputs = useMemo(
    () => buildToolCallInputMap(visibleMessages),
    [visibleMessages],
  )

  const handleSubmit = async () => {
    const text = textareaRef.current?.plainText.trim()
    if (!text || status === "working") return;

    setStatus("working")
    const userMessage: ModelMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    textareaRef.current?.clear()

    await jevLoop(nextMessages, (message) => setMessages((prev) => [...prev, message]));
    setStatus("ready");
  }

  return (
    <box flexDirection="column" height={height} padding={1}>
      <scrollbox
        flexGrow={1}
        flexShrink={1}
        width="100%"
        stickyScroll={true}
        stickyStart="bottom"
      >
        {props.initialMessage && <text fg={"red"}>{props.initialMessage}</text>}
        {visibleMessages.map((message, index) => (
          <MessageContent
            key={index}
            message={message}
            toolCallInputs={toolCallInputs}
          />
        ))}
      </scrollbox>
      {status !== "ready" && <text>{status.toUpperCase()}</text>}
      <textarea
        ref={textareaRef}
        marginY={visibleMessages.length > 0 ? 1 : 0}
        placeholder="What would you like to do"
        keyBindings={chatKeyBindings}
        onSubmit={handleSubmit}
        focused={true}
      />
    </box>
  )
}

let initialMessage: null | string = null;
const seedMessages = await frontLoadMessages();

console.log("Connecting MCPs...");
try {
  await mcpClient.loadConfig()
  await mcpClient.connectAll()
} catch (e) {
  initialMessage = "Error with MCP process: " + e;
}

process.on("exit", () => { void mcpClient.close() })
const renderer = await createCliRenderer()
createRoot(renderer).render(<App initialMessage={initialMessage} seedMessages={seedMessages} />)
