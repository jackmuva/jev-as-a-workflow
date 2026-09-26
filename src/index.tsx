import { createCliRenderer, type KeyBinding, type TextareaRenderable } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { useState, useRef } from "react";
import { jevLoop } from "./services/agent/agent-loop";
import type { Message } from "./models/message";
import { mcpClient } from "./services/mcp/mcp-client";

const chatKeyBindings: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "kpenter", action: "submit" },
  { name: "kpenter", shift: true, action: "newline" },
  { name: "linefeed", action: "submit" },
  { name: "linefeed", shift: true, action: "newline" },
]

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"ready" | "working" | "error">("ready")
  const textareaRef = useRef<TextareaRenderable>(null)

  const handleSubmit = async () => {
    const text = textareaRef.current?.plainText.trim()
    if (!text || status === "working") return;

    setStatus("working")
    setMessages((prev) => [...prev, {
      role: "USER",
      type: "text",
      content: text
    }])
    textareaRef.current?.clear()

    await jevLoop(messages, (message) => setMessages((prev) => [...prev, message]));
    setStatus("ready");
  }

  return (
    <box padding={1}>
      <box>
        {messages.map((message, index) => {
          return (<text key={index}>
            {message.content}
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

await mcpClient.loadConfig()
await mcpClient.connectAll()
process.on("exit", () => { void mcpClient.close() })

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)
