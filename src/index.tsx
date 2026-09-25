import { createCliRenderer, type KeyBinding, type TextareaRenderable } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { useState, useCallback, useRef } from "react";
import { jevLoop } from "./agent/agent-loop";

const chatKeyBindings: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "kpenter", action: "submit" },
  { name: "kpenter", shift: true, action: "newline" },
  { name: "linefeed", action: "submit" },
  { name: "linefeed", shift: true, action: "newline" },
]

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState<"ready" | "working" | "error">("ready")
  const textareaRef = useRef<TextareaRenderable>(null)

  const handleSubmit = useCallback(() => {
    const text = textareaRef.current?.plainText.trim()
    if (!text) return

    setStatus("working")
    setMessages((prev) => [...prev, text])
    textareaRef.current?.clear()
    
    jevLoop(text, (message) => setMessages((prev) => [...prev, message]));
    setStatus("ready")
  }, [])

  return (
    <box padding={1}>
      <box>
        {messages.map((message, index) => {
          return (<text key={index}>
            {message}
          </text>)
        })}
      </box>
      {status !== "ready" && <text>{status.toUpperCase()}</text>}
      <textarea
        ref={textareaRef}
        marginY={messages.length > 0 ? 1: 0}
        placeholder="What would you like to do"
        keyBindings={chatKeyBindings}
        onSubmit={handleSubmit}
        focused={true}
      />
    </box>
  )
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)
