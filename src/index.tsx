import { createCliRenderer, type KeyBinding, type TextareaRenderable } from "@opentui/core"
import { createRoot, useTerminalDimensions } from "@opentui/react"
import { useState, useRef } from "react";
import { jevLoop } from "./services/agent/agent-loop";
import { frontLoadMessages } from "./services/agent/hooks/front-load";
import type { ModelMessage } from "ai";
import { mcpClient } from "./services/mcp/mcp-client";
import {
  AGENT_BORDER_COLOR,
  ClarifyQuestionBox,
  formatToolResultText,
  ToolResultBox,
} from "./components/tool";
import { WorkingIndicator } from "./components/spinner";
import { findPendingAskQuestion } from "./services/agent/utils/ask-question-state";

const chatKeyBindings: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "kpenter", action: "submit" },
  { name: "kpenter", shift: true, action: "newline" },
  { name: "linefeed", action: "submit" },
  { name: "linefeed", shift: true, action: "newline" },
]

const MessageContent = ({ message }: { message: ModelMessage }) => {
  const isAgent = message.role === "assistant" || message.role === "tool"

  if (message.role === "tool" && Array.isArray(message.content)) {
    return (
      <>
        {message.content.map((part, index) => {
          if (part.type !== "tool-result") return null
          const isMessageAnswer = part.toolName.endsWith("/message_answer")
          const isAskQuestion = part.toolName === "AskQuestion"
          if (isMessageAnswer) {
            return (
              <box key={index}
                border={["left"]}
                borderColor={AGENT_BORDER_COLOR}
                paddingLeft={1}
                marginBottom={1}
                width="100%" >
                <text>{formatToolResultText(part)}</text>
              </box>
            )
          }
          if (isAskQuestion) {
            return (
              <box key={index}
                border={["left"]}
                borderColor={AGENT_BORDER_COLOR}
                paddingLeft={1}
                marginBottom={1}
                width="100%" >
                <text fg={AGENT_BORDER_COLOR}>Your answers</text>
                <text>{formatToolResultText(part)}</text>
              </box>
            )
          }
          return (
            <ToolResultBox
              key={index}
              part={part}
            />
          )
        })}
      </>
    )
  }

  const text = typeof message.content === "string" ? message.content : "";

  if (text) {
    return (
      <box border={isAgent ? ["left"] : false}
        borderColor={isAgent ? AGENT_BORDER_COLOR : undefined}
        paddingLeft={isAgent ? 1 : 0}
        marginBottom={1}
        width="100%" >
        <text>{text}</text>
      </box>
    )
  }
}

function App(props: { initialMessage?: string | null; seedMessages: ModelMessage[] }) {
  const [messages, setMessages] = useState<ModelMessage[]>(props.seedMessages);
  const [status, setStatus] = useState<"ready" | "working" | "error">("ready")
  const textareaRef = useRef<TextareaRenderable>(null)
  const { height } = useTerminalDimensions()
  const pendingAsk = findPendingAskQuestion(messages)

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

  const handleAskQuestionSubmit = async (answersText: string) => {
    if (!pendingAsk || status === "working") return;

    setStatus("working")
    const toolResult: ModelMessage = {
      role: "tool",
      content: [{
        type: "tool-result",
        toolCallId: pendingAsk.toolCallId,
        toolName: "AskQuestion",
        output: { type: "text", value: answersText },
      }],
    };
    const nextMessages = [...messages, toolResult];
    setMessages(nextMessages);

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
      {status === "working" && <WorkingIndicator />}
      {status === "error" && <text>ERROR</text>}
      {pendingAsk ? (
        <ClarifyQuestionBox
          input={pendingAsk.input}
          onSubmit={handleAskQuestionSubmit}
        />
      ) : (
        <textarea
          ref={textareaRef}
          marginY={visibleMessages.length > 0 ? 1 : 0}
          placeholder="What would you like to do"
          keyBindings={chatKeyBindings}
          onSubmit={handleSubmit}
          focused={true}
        />
      )}
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
