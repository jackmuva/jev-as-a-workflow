import { useTerminalDimensions } from "@opentui/react"
import { useCallback, useMemo, useState } from "react"
import { jevLoop } from "../services/agent/agent-loop"
import {
  getCapabilitySelection,
  isCatalogEmpty,
  selectAllCapabilities,
  setCapabilitySelection,
} from "../services/agent/capabilities"
import { frontLoadMessages } from "../services/agent/hooks/front-load"
import { findPendingAskQuestion } from "../services/agent/utils/ask-question-state"
import { jevMessage } from "../services/agent/utils/jev-message"
import { useSessionPersistence } from "./hooks/useSessionPersistence"
import { buildToolCallInputMap } from "./lib/format/format"
import { CompletionOverlayDialog } from "./components/input/CompletionOverlayDialog"
import { CapabilitySelectionDialog } from "./components/session/CapabilitySelectionDialog"
import { SessionSelectionDialog } from "./components/session/SessionSelectionDialog"
import { ChatInput } from "./components/input/ChatInput"
import { ClarifyQuestionBox } from "./components/primitives/ClarifyQuestionBox"
import { MessageContent } from "./components/primitives/MessageContent"
import { WorkingIndicator } from "./components/primitives/WorkingIndicator"
import type { CompletionState } from "../models/ui"
import { resolveUserMessage } from "./lib/input-completion/at-files"
import type { CapabilityCatalog, CapabilitySelection, JevMessage } from "../models/agent"

type AppProps = {
  initialMessage?: string | null
  seedMessages: JevMessage[]
  capabilityCatalog: CapabilityCatalog
}

export function App({ initialMessage, seedMessages, capabilityCatalog }: AppProps) {
  const {
    messages,
    setMessages,
    clearSession,
    getSessions,
    resumeSession,
    replaceSeedMessages,
    session,
  } = useSessionPersistence(seedMessages)
  const [status, setStatus] = useState<"ready" | "working" | "error">("ready")
  const [completion, setCompletion] = useState<CompletionState>({ open: false })
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false)
  // Ask which skills, MCPs, and user tools to enable at the start of every session.
  const [capabilityPickerOpen, setCapabilityPickerOpen] = useState(
    () => !isCatalogEmpty(capabilityCatalog),
  )
  const { width, height } = useTerminalDimensions()
  const pendingAsk = findPendingAskQuestion(messages)

  const visibleMessages = useMemo(
    () => messages.filter(({ message }) => message.role !== "system"),
    [messages],
  )

  const toolCallInputs = useMemo(
    () => buildToolCallInputMap(visibleMessages),
    [visibleMessages],
  )

  const openCapabilityPicker = useCallback(() => {
    setCapabilityPickerOpen(!isCatalogEmpty(capabilityCatalog))
  }, [capabilityCatalog])

  const slashCommandHandlers = useMemo(
    () => ({
      clearSession: () => {
        clearSession()
        openCapabilityPicker()
      },
      resumeSession: () => setSessionPickerOpen(true),
      configureCapabilities: openCapabilityPicker,
    }),
    [clearSession, openCapabilityPicker],
  )

  const handleCapabilityConfirm = useCallback(async (selection: CapabilitySelection) => {
    setCapabilitySelection(selection)
    replaceSeedMessages((await frontLoadMessages()).map((message) => jevMessage(message)))
    setCapabilityPickerOpen(false)
  }, [replaceSeedMessages])

  const handleSessionSelect = useCallback((sessionId: string) => {
    resumeSession(sessionId)
    setSessionPickerOpen(false)
    openCapabilityPicker()
  }, [openCapabilityPicker, resumeSession])

  const handleSessionPickerDismiss = useCallback(() => {
    setSessionPickerOpen(false)
  }, [])

  const handleCompletionChange = useCallback((next: CompletionState) => {
    setCompletion(next)
  }, [])

  const handleSubmit = async (text: string) => {
    if (!text || status === "working") return

    setStatus("working")
    const userMessage = await resolveUserMessage(text)
    const nextMessages = [...messages, jevMessage(userMessage)]
    setMessages(nextMessages)

    await jevLoop(nextMessages, setMessages)
    setStatus("ready")
  }

  const handleAskQuestionSubmit = async (answersText: string) => {
    if (!pendingAsk || status === "working") return

    setStatus("working")
    const toolResult = jevMessage({
      role: "tool",
      content: [{
        type: "tool-result",
        toolCallId: pendingAsk.toolCallId,
        toolName: "AskQuestion",
        output: { type: "text", value: answersText },
      }],
    })
    const nextMessages = [...messages, toolResult]
    setMessages(nextMessages)

    await jevLoop(nextMessages, setMessages)
    setStatus("ready")
  }

  return (
    <box flexDirection="column" height={height} width="100%" padding={1} position="relative">
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
          disabled={status === "working" || capabilityPickerOpen}
          marginY={visibleMessages.length > 0 ? 1 : 0}
          slashCommandHandlers={slashCommandHandlers}
          onCompletionChange={handleCompletionChange}
          onSubmit={handleSubmit}
        />
      )}
      {completion.open && (
        <CompletionOverlayDialog
          kind={completion.trigger.kind}
          items={completion.items}
          selectedIndex={completion.selectedIndex}
          terminalWidth={width}
          terminalHeight={height}
        />
      )}
      {sessionPickerOpen && (
        <SessionSelectionDialog
          sessions={getSessions()}
          currentSessionId={session.id}
          onSelect={handleSessionSelect}
          onDismiss={handleSessionPickerDismiss}
          terminalWidth={width}
          terminalHeight={height}
        />
      )}
      {capabilityPickerOpen && (
        <CapabilitySelectionDialog
          catalog={capabilityCatalog}
          initialSelection={getCapabilitySelection() ?? selectAllCapabilities(capabilityCatalog)}
          onConfirm={handleCapabilityConfirm}
          onDismiss={() => setCapabilityPickerOpen(false)}
          terminalWidth={width}
          terminalHeight={height}
        />
      )}
    </box>
  )
}
