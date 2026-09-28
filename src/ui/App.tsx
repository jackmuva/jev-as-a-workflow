import { useTerminalDimensions } from "@opentui/react"
import type { ModelMessage } from "ai"
import { useMemo, useState } from "react"
import { jevLoop } from "../services/agent/agent-loop"
import { findPendingAskQuestion } from "../services/agent/utils/ask-question-state"
import { useSessionPersistence } from "./hooks/useSessionPersistence"
import { buildToolCallInputMap } from "./lib/format"
import { resolveUserMessage } from "./lib/input-completion/resolve-message"
import { ChatInput } from "./components/input/ChatInput"
import { ClarifyQuestionBox } from "./components/primitives/ClarifyQuestionBox"
import { MessageContent } from "./components/primitives/MessageContent"
import { WorkingIndicator } from "./components/primitives/WorkingIndicator"

type AppProps = {
  initialMessage?: string | null
  seedMessages: ModelMessage[]
}

export function App({ initialMessage, seedMessages }: AppProps) {
  const { messages, setMessages } = useSessionPersistence(seedMessages)
  const [status, setStatus] = useState<"ready" | "working" | "error">("ready")
  const { height } = useTerminalDimensions()
  const pendingAsk = findPendingAskQuestion(messages)

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages],
  )

  const toolCallInputs = useMemo(
    () => buildToolCallInputMap(visibleMessages),
    [visibleMessages],
  )

  const handleSubmit = async (text: string) => {
    if (!text || status === "working") return

    setStatus("working")
    const userMessage = await resolveUserMessage(text)
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)

    await jevLoop(nextMessages, setMessages)
    setStatus("ready")
  }

  const handleAskQuestionSubmit = async (answersText: string) => {
    if (!pendingAsk || status === "working") return

    setStatus("working")
    const toolResult: ModelMessage = {
      role: "tool",
      content: [{
        type: "tool-result",
        toolCallId: pendingAsk.toolCallId,
        toolName: "AskQuestion",
        output: { type: "text", value: answersText },
      }],
    }
    const nextMessages = [...messages, toolResult]
    setMessages(nextMessages)

    await jevLoop(nextMessages, setMessages)
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
      {status === "working" && <WorkingIndicator />}
      {status === "error" && <text>ERROR</text>}
      {pendingAsk ? (
        <ClarifyQuestionBox
          input={pendingAsk.input}
          onSubmit={handleAskQuestionSubmit}
        />
      ) : (
        <ChatInput
          disabled={status === "working"}
          marginY={visibleMessages.length > 0 ? 1 : 0}
          onSubmit={handleSubmit}
        />
      )}
    </box>
  )
}
