import type { KeyBinding, TextareaRenderable } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/react"
import type { ModelMessage } from "ai"
import { useMemo, useRef, useState } from "react"
import { jevLoop } from "../services/agent/agent-loop"
import { buildToolCallInputMap } from "./lib/format"
import { MessageContent } from "./primitives/MessageContent"

const chatKeyBindings: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "kpenter", action: "submit" },
  { name: "kpenter", shift: true, action: "newline" },
  { name: "linefeed", action: "submit" },
  { name: "linefeed", shift: true, action: "newline" },
]

type AppProps = {
  initialMessage?: string | null
  seedMessages: ModelMessage[]
}

export function App({ initialMessage, seedMessages }: AppProps) {
  const [messages, setMessages] = useState<ModelMessage[]>(seedMessages)
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
    if (!text || status === "working") return

    setStatus("working")
    const userMessage: ModelMessage = { role: "user", content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    textareaRef.current?.clear()

    await jevLoop(nextMessages, (message) => setMessages((prev) => [...prev, message]))
    setStatus("ready")
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
        {initialMessage && <text fg={"red"}>{initialMessage}</text>}
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
