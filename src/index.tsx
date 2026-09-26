import { createCliRenderer, type KeyBinding, type TextareaRenderable } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { useState, useRef } from "react";
import { jevLoop } from "./services/agent/agent-loop";
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

const formatMessage = (message: ModelMessage): string => {
  if (typeof message.content === "string") return message.content
  return message.content.map((part) => {
    switch (part.type) {
      case "text":
      case "reasoning":
        return part.text
      case "tool-call":
        return `[tool call: ${part.toolName}]`
      case "tool-result":
        return "value" in part.output
          ? `${part.toolName}: ${typeof part.output.value === "string" ? part.output.value : JSON.stringify(part.output.value)}`
          : `${part.toolName}: [${part.output.type}]`
      default:
        return `[${part.type}]`
    }
  }).join("\n")
}

function App(props: { initialMessage?: string | null }) {
  const [messages, setMessages] = useState<ModelMessage[]>([]);
  const [status, setStatus] = useState<"ready" | "working" | "error">("ready")
  const textareaRef = useRef<TextareaRenderable>(null)

  const handleSubmit = async () => {
    const text = textareaRef.current?.plainText.trim()
    if (!text || status === "working") return;

    setStatus("working")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    textareaRef.current?.clear()

    await jevLoop(messages, (message) => setMessages((prev) => [...prev, message]));
    setStatus("ready");
  }

  return (
    <box padding={1}>
      <box>
        {props.initialMessage && <text fg={"red"}>{props.initialMessage}</text>}
        {messages.map((message, index) => {
          return (<text key={index}>
            {formatMessage(message)}
          </text>)
        })}
      </box>
      {status !== "ready" && <text>{status.toUpperCase()}</text>}
      <textarea
        ref={textareaRef}
        marginY={messages.length > 0 ? 1 : 0}
        placeholder="What would you like to do"
        keyBindings={chatKeyBindings}
        onSubmit={handleSubmit}
        focused={true}
      />
    </box>
  )
}

let initialMessage: null | string = null;

console.log("Connecting MCPs...");
try {
  await mcpClient.loadConfig()
  await mcpClient.connectAll()
} catch (e) {
  initialMessage = "Error with MCP process: " + e;
}

process.on("exit", () => { void mcpClient.close() })
const renderer = await createCliRenderer()
createRoot(renderer).render(<App initialMessage={initialMessage} />)

