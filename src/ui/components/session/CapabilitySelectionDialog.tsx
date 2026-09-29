import { useKeyboard } from "@opentui/react"
import { useMemo, useState } from "react"
import type {
  CapabilityCatalog,
  CapabilityKind,
  CapabilitySelection,
} from "../../../services/agent/capabilities"
import { AGENT_BORDER_COLOR } from "../primitives/ToolFrame"

const DIALOG_WIDTH = 64
const DIALOG_PADDING = 2
const DIALOG_BORDER = 2
const MAX_VISIBLE_ROWS = 16
const INSTRUCTIONS = "↑/↓ navigate · Space toggle · A toggle all · Enter apply · Esc cancel"
const ACCENT_FG = "#7aa2f7"
const TEXT_FG = "#c0caf5"
const MUTED_FG = "#565f89"
const HIGHLIGHT_BG = "#283457"

const SECTIONS: Array<{ kind: CapabilityKind, title: string }> = [
  { kind: "skills", title: "Skills" },
  { kind: "mcpServers", title: "MCP servers" },
  { kind: "userTools", title: "User tools" },
]

type Row =
  | { type: "all" }
  | { type: "header", title: string }
  | { type: "item", kind: CapabilityKind, name: string, description?: string }

type CapabilitySelectionDialogProps = {
  catalog: CapabilityCatalog
  initialSelection: CapabilitySelection
  onConfirm: (selection: CapabilitySelection) => void
  onDismiss: () => void
  terminalWidth: number
  terminalHeight: number
}

const toSets = (selection: CapabilitySelection) => ({
  skills: new Set(selection.skills),
  mcpServers: new Set(selection.mcpServers),
  userTools: new Set(selection.userTools),
})

export const CapabilitySelectionDialog = ({
  catalog,
  initialSelection,
  onConfirm,
  onDismiss,
  terminalWidth,
  terminalHeight,
}: CapabilitySelectionDialogProps) => {
  const [enabled, setEnabled] = useState(() => toSets(initialSelection))
  const [cursor, setCursor] = useState(0)

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [{ type: "all" }]
    for (const { kind, title } of SECTIONS) {
      if (catalog[kind].length === 0) continue
      result.push({ type: "header", title })
      for (const entry of catalog[kind]) {
        result.push({ type: "item", kind, name: entry.name, description: entry.description })
      }
    }
    return result
  }, [catalog])

  const selectableIndices = useMemo(
    () => rows.flatMap((row, index) => (row.type === "header" ? [] : [index])),
    [rows],
  )

  const totalItems = selectableIndices.length - 1
  const enabledCount = enabled.skills.size + enabled.mcpServers.size + enabled.userTools.size
  const allSelected = enabledCount === totalItems

  const setAll = (value: boolean) => {
    setEnabled({
      skills: new Set(value ? catalog.skills.map((entry) => entry.name) : []),
      mcpServers: new Set(value ? catalog.mcpServers.map((entry) => entry.name) : []),
      userTools: new Set(value ? catalog.userTools.map((entry) => entry.name) : []),
    })
  }

  const toggleRow = (row: Row | undefined) => {
    if (!row || row.type === "header") return
    if (row.type === "all") {
      setAll(!allSelected)
      return
    }
    setEnabled((previous) => {
      const next = new Set(previous[row.kind])
      if (next.has(row.name)) next.delete(row.name)
      else next.add(row.name)
      return { ...previous, [row.kind]: next }
    })
  }

  useKeyboard((key) => {
    const count = selectableIndices.length
    if (key.name === "up") {
      setCursor((index) => (index - 1 + count) % count)
    } else if (key.name === "down" || key.name === "tab") {
      setCursor((index) => (index + 1) % count)
    } else if (key.name === "space") {
      toggleRow(rows[selectableIndices[cursor]!])
    } else if (key.name === "a") {
      setAll(!allSelected)
    } else if (key.name === "escape") {
      onDismiss()
    } else if (key.name === "return" || key.name === "kpenter") {
      onConfirm({
        skills: catalog.skills.map((entry) => entry.name).filter((name) => enabled.skills.has(name)),
        mcpServers: catalog.mcpServers.map((entry) => entry.name).filter((name) => enabled.mcpServers.has(name)),
        userTools: catalog.userTools.map((entry) => entry.name).filter((name) => enabled.userTools.has(name)),
      })
    }
  })

  const dialogWidth = Math.min(DIALOG_WIDTH, Math.max(28, terminalWidth - 4))
  const innerWidth = dialogWidth - DIALOG_BORDER - DIALOG_PADDING
  // Title and counter line plus the instructions, which wrap on narrow terminals.
  const headerLines = 2 + Math.ceil(INSTRUCTIONS.length / innerWidth)
  const chromeLines = headerLines + DIALOG_PADDING + DIALOG_BORDER
  const listHeight = Math.max(
    1,
    Math.min(MAX_VISIBLE_ROWS, rows.length, terminalHeight - 2 - chromeLines),
  )
  const dialogHeight = listHeight + chromeLines
  const top = Math.max(1, Math.floor((terminalHeight - dialogHeight) / 2))
  const left = Math.max(1, Math.floor((terminalWidth - dialogWidth) / 2))

  // Keep the highlighted row centered in view once the list overflows.
  const highlightedRow = selectableIndices[cursor] ?? 0
  const scrollStart = Math.min(
    Math.max(0, rows.length - listHeight),
    Math.max(0, highlightedRow - Math.floor(listHeight / 2)),
  )
  const visibleRows = rows.slice(scrollStart, scrollStart + listHeight)

  const truncate = (text: string, width: number) =>
    text.length > width ? `${text.slice(0, Math.max(0, width - 1))}…` : text

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
        <text fg={AGENT_BORDER_COLOR} flexShrink={0}>Enable skills, MCPs, and tools</text>
        <text fg={MUTED_FG} flexShrink={0}>{`${enabledCount} of ${totalItems} enabled`}</text>
        <text fg={MUTED_FG} flexShrink={0}>{INSTRUCTIONS}</text>
        <box flexDirection="column" height={listHeight} flexShrink={0}>
          {visibleRows.map((row, offset) => {
            const index = scrollStart + offset
            const highlighted = index === highlightedRow
            if (row.type === "header") {
              return (
                <text key={index} fg={ACCENT_FG} flexShrink={0}>
                  {row.title}
                </text>
              )
            }

            const checked = row.type === "all" ? allSelected : enabled[row.kind].has(row.name)
            const label = row.type === "all" ? "Select all" : row.name
            const prefix = `${highlighted ? "›" : " "} [${checked ? "x" : " "}] `
            const detail = row.type === "item" && row.description
              ? ` — ${row.description.replace(/\s+/g, " ")}`
              : ""
            const line = truncate(`${prefix}${label}${detail}`, innerWidth)
            return (
              <text
                key={index}
                fg={highlighted ? TEXT_FG : row.type === "all" ? TEXT_FG : MUTED_FG}
                bg={highlighted ? HIGHLIGHT_BG : undefined}
                flexShrink={0}
              >
                {line}
              </text>
            )
          })}
        </box>
      </box>
    </>
  )
}
