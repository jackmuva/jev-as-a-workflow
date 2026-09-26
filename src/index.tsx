import { createCliRenderer, type KeyBinding, type TextareaRenderable } from "@opentui/core"
import { createRoot, useTerminalDimensions } from "@opentui/react"
import { useState, useRef } from "react";
import { jevLoop } from "./services/agent/agent-loop";
import { frontLoadMessages } from "./services/agent/hooks/front-load";
import type { ModelMessage } from "ai";
import { mcpClient } from "./services/mcp/mcp-client";

const chatKeyBindings: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "kpenter", action: "submit" },
  { name: "kpenter", shift: true, action: "newline" },
  { name: "linefeed", action: "submit" },
  { name: "linefeed", shift: true, action: "newline" },
]

const AGENT_BORDER_COLOR = "#565f89"
const TOOL_RESULT_MAX_HEIGHT = 12

type ToolResultPart = Extract<
  NonNullable<ModelMessage["content"]>[number],
  { type: "tool-result" }
>

const formatToolResultText = (part: ToolResultPart): string => {
  if ("value" in part.output) {
    const value = part.output.value
    if (typeof value === "string") return value
    return JSON.stringify(value, null, 2)
  }
  return `[${part.output.type}]`
}

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
        parts.push(`[tool call: ${part.toolName}]`)
        break
      case "tool-result":
        parts.push(`${part.toolName}: ${formatToolResultText(part)}`)
        break
      default:
        parts.push(`[${part.type}]`)
    }
  }
  return parts.join("")
}

const ToolResultBox = ({ toolName, text }: { toolName: string; text: string }) => {
  const lineCount = Math.max(1, text.split("\n").length)
  const needsScroll = lineCount > TOOL_RESULT_MAX_HEIGHT

  return (
    <box
      border={true}
      borderColor={AGENT_BORDER_COLOR}
      paddingLeft={1}
      marginBottom={1}
      width="75%"
    >
      <text>{toolName}</text>
      {needsScroll ? (
        <scrollbox height={TOOL_RESULT_MAX_HEIGHT} width="100%">
          <text>{text}</text>
        </scrollbox>
      ) : (
        <text>{text}</text>
      )}
    </box>
  )
}

const MessageContent = ({ message }: { message: ModelMessage }) => {
  const isAgent = message.role === "assistant" || message.role === "tool"

  if (message.role === "tool" && Array.isArray(message.content)) {
    return (
      <>
        {message.content.map((part, index) => {
          if (part.type !== "tool-result") return null
          return (
            <ToolResultBox
              key={index}
              toolName={part.toolName}
              text={formatToolResultText(part)}
            />
          )
        })}
      </>
    )
  }

  const text = formatMessageContent(message)

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

  const visibleMessages = messages.filter((message) => message.role !== "system")

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
          <MessageContent key={index} message={message} />
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
