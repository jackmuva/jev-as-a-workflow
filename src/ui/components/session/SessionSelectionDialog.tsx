import type { SelectOption } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useEffect, useMemo, useState } from "react"
import type { SessionRecord } from "../../../services/session/store"
import { AGENT_BORDER_COLOR } from "../primitives/ToolFrame"

const MAX_VISIBLE_ITEMS = 6
const DIALOG_WIDTH = 56
const HEADER_LINES = 2
const DIALOG_PADDING = 2

type SessionSelectionDialogProps = {
  sessions: SessionRecord[]
  currentSessionId: string
  onSelect: (sessionId: string) => void
  onDismiss: () => void
  terminalWidth: number
  terminalHeight: number
}

const formatSessionLabel = (session: SessionRecord) =>
  session.title?.trim() || "Untitled session"

const formatSessionDescription = (session: SessionRecord, isCurrent: boolean) => {
  const updated = new Date(session.updatedAt).toLocaleString()
  return isCurrent ? `Current · Updated ${updated}` : `Updated ${updated}`
}

export const SessionSelectionDialog = ({
  sessions,
  currentSessionId,
  onSelect,
  onDismiss,
  terminalWidth,
  terminalHeight,
}: SessionSelectionDialogProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const currentIndex = sessions.findIndex((session) => session.id === currentSessionId)
    setSelectedIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [currentSessionId, sessions])

  useKeyboard((key) => {
    if (sessions.length === 0) {
      if (key.name === "escape" || key.name === "return" || key.name === "kpenter") {
        onDismiss()
      }
      return
    }

    if (key.name === "up") {
      setSelectedIndex((index) => (index - 1 + sessions.length) % sessions.length)
      return
    }

    if (key.name === "down") {
      setSelectedIndex((index) => (index + 1) % sessions.length)
      return
    }

    if (key.name === "return" || key.name === "kpenter") {
      const session = sessions[selectedIndex]
      if (session) onSelect(session.id)
      return
    }

    if (key.name === "escape") {
      onDismiss()
    }
  })

  const options: SelectOption[] = useMemo(
    () =>
      sessions.map((session) => ({
        name: formatSessionLabel(session),
        description: formatSessionDescription(session, session.id === currentSessionId),
        value: session.id,
      })),
    [currentSessionId, sessions],
  )

  const linesPerItem = 2
  const listHeight = Math.min(
    MAX_VISIBLE_ITEMS * linesPerItem,
    Math.max(linesPerItem, options.length * linesPerItem),
  )
  const dialogHeight = listHeight + HEADER_LINES + DIALOG_PADDING + (sessions.length === 0 ? 1 : 0)
  const dialogWidth = Math.min(DIALOG_WIDTH, Math.max(24, terminalWidth - 4))
  const top = Math.max(1, Math.floor((terminalHeight - dialogHeight) / 2))
  const left = Math.max(1, Math.floor((terminalWidth - dialogWidth) / 2))

  return (
    <>
      <box
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
        zIndex={5}
        backgroundColor="#000000"
        opacity={0.45}
      />
      <box
        position="absolute"
        top={top}
        left={left}
        width={dialogWidth}
        height={dialogHeight}
        zIndex={10}
        border={true}
        borderColor={AGENT_BORDER_COLOR}
        backgroundColor="#1a1b26"
        flexDirection="column"
        padding={1}
      >
        <text fg={AGENT_BORDER_COLOR}>Resume session</text>
        <text fg="#565f89">↑/↓ to navigate · Enter to resume · Esc to dismiss</text>
        {sessions.length === 0 ? (
          <text fg="#565f89">No saved sessions for this workspace</text>
        ) : (
          <select
            options={options}
            selectedIndex={selectedIndex}
            showDescription={true}
            showSelectionIndicator={true}
            height={listHeight}
            width="100%"
            focused={false}
          />
        )}
      </box>
    </>
  )
}
