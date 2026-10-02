import type { SelectOption } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useEffect, useMemo, useState } from "react"
import type { SessionRecord } from "../../../db/session-store"
import { AGENT_BORDER_COLOR } from "../primitives/ToolFrame"

const MAX_VISIBLE_ITEMS = 6
const DIALOG_WIDTH = 56
const DIALOG_PADDING = 2
const DIALOG_BORDER = 2
const DEFAULT_INSTRUCTIONS = "↑/↓ to navigate · Enter to resume · Esc to dismiss"

type SessionSelectionDialogProps = {
  sessions: SessionRecord[]
  currentSessionId?: string
  title?: string
  instructions?: string
  emptyMessage?: string
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
  title = "Resume session",
  instructions = DEFAULT_INSTRUCTIONS,
  emptyMessage = "No saved sessions for this workspace",
  onSelect,
  onDismiss,
  terminalWidth,
  terminalHeight,
}: SessionSelectionDialogProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!currentSessionId) {
      setSelectedIndex(0)
      return
    }
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
        description: formatSessionDescription(session, currentSessionId !== undefined && session.id === currentSessionId),
        value: session.id,
      })),
    [currentSessionId, sessions],
  )

  const dialogWidth = Math.min(DIALOG_WIDTH, Math.max(24, terminalWidth - 4))
  const innerWidth = dialogWidth - DIALOG_BORDER - DIALOG_PADDING
  // Title line plus the instructions, which wrap on narrow terminals.
  const headerLines = 1 + Math.ceil(instructions.length / innerWidth)
  const chromeLines = headerLines + DIALOG_PADDING + DIALOG_BORDER

  const linesPerItem = 2
  const maxListHeight = Math.max(linesPerItem, terminalHeight - 2 - chromeLines)
  const listHeight = Math.min(
    MAX_VISIBLE_ITEMS * linesPerItem,
    maxListHeight,
    Math.max(linesPerItem, options.length * linesPerItem),
  )
  const bodyHeight = sessions.length === 0 ? 1 : listHeight
  const dialogHeight = bodyHeight + chromeLines
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
        <text fg={AGENT_BORDER_COLOR} flexShrink={0}>{title}</text>
        <text fg="#565f89" flexShrink={0}>{instructions}</text>
        {sessions.length === 0 ? (
          <text fg="#565f89" flexShrink={0}>{emptyMessage}</text>
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
