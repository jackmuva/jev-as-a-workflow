import { useKeyboard } from "@opentui/react"
import { useMemo, useState } from "react"
import type {
  CapabilityCatalog,
  CapabilityKind,
  CapabilitySelection,
} from "../../../models/agent"
import { AGENT_BORDER_COLOR } from "../primitives/ToolFrame"

const DIALOG_WIDTH = 64
const DIALOG_PADDING = 2
const DIALOG_BORDER = 2
const MAX_VISIBLE_ROWS = 14
const INSTRUCTIONS = "←/→ tabs · ↑/↓ navigate · Space toggle · A select all · Enter apply · Esc cancel"
const ACCENT_FG = "#7aa2f7"
const TEXT_FG = "#c0caf5"
const MUTED_FG = "#565f89"
const HIGHLIGHT_BG = "#283457"
const DONE_FG = "#9ece6a"

const TABS: Array<{ kind: CapabilityKind, label: string }> = [
  { kind: "mcpServers", label: "MCP" },
  { kind: "skills", label: "Skills" },
  { kind: "userTools", label: "Tools" },
  { kind: "agentsMd", label: "AGENTS.md" },
]

const EMPTY_MESSAGES: Record<CapabilityKind, string> = {
  mcpServers: "No MCP servers configured",
  skills: "No skills discovered",
  userTools: "No user tools found",
  agentsMd: "No AGENTS.md in this workspace",
}

type Row =
  | { type: "selectAll" }
  | { type: "item", name: string, description?: string }

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
  agentsMd: new Set(selection.agentsMd),
})

export const CapabilitySelectionDialog = ({
  catalog,
  initialSelection,
  onConfirm,
  onDismiss,
  terminalWidth,
  terminalHeight,
}: CapabilitySelectionDialogProps) => {
  const visibleTabs = useMemo(
    () => TABS.filter(({ kind }) => catalog[kind].length > 0),
    [catalog],
  )
  const [enabled, setEnabled] = useState(() => toSets(initialSelection))
  const [tabIndex, setTabIndex] = useState(0)
  const [cursor, setCursor] = useState(0)

  const activeTab = visibleTabs[tabIndex] ?? visibleTabs[0]
  const activeKind = activeTab?.kind ?? "skills"
  const activeItems = catalog[activeKind]

  const rows = useMemo<Row[]>(() => {
    if (activeItems.length === 0) return []
    return [
      { type: "selectAll" },
      ...activeItems.map((entry) => ({
        type: "item" as const,
        name: entry.name,
        description: entry.description,
      })),
    ]
  }, [activeItems])

  const enabledInTab = activeItems.filter((entry) => enabled[activeKind].has(entry.name)).length
  const allSelectedInTab = activeItems.length > 0 && enabledInTab === activeItems.length

  const setAllInTab = (value: boolean) => {
    setEnabled((previous) => ({
      ...previous,
      [activeKind]: new Set(value ? activeItems.map((entry) => entry.name) : []),
    }))
  }

  const toggleRow = (row: Row | undefined) => {
    if (!row) return
    if (row.type === "selectAll") {
      setAllInTab(!allSelectedInTab)
      return
    }
    setEnabled((previous) => {
      const next = new Set(previous[activeKind])
      if (next.has(row.name)) next.delete(row.name)
      else next.add(row.name)
      return { ...previous, [activeKind]: next }
    })
  }

  const goToTab = (index: number) => {
    const next = ((index % visibleTabs.length) + visibleTabs.length) % visibleTabs.length
    setTabIndex(next)
    setCursor(0)
  }

  const buildSelection = (): CapabilitySelection => ({
    skills: catalog.skills.map((entry) => entry.name).filter((name) => enabled.skills.has(name)),
    mcpServers: catalog.mcpServers.map((entry) => entry.name).filter((name) => enabled.mcpServers.has(name)),
    userTools: catalog.userTools.map((entry) => entry.name).filter((name) => enabled.userTools.has(name)),
    agentsMd: catalog.agentsMd.map((entry) => entry.name).filter((name) => enabled.agentsMd.has(name)),
  })

  useKeyboard((key) => {
    if (visibleTabs.length === 0) {
      if (key.name === "escape" || key.name === "return" || key.name === "kpenter") {
        onDismiss()
      }
      return
    }

    if (key.name === "left" && visibleTabs.length > 1) {
      goToTab(tabIndex - 1)
      return
    }

    if (key.name === "right" && visibleTabs.length > 1) {
      goToTab(tabIndex + 1)
      return
    }

    if (rows.length === 0) return

    if (key.name === "up") {
      setCursor((index) => (index - 1 + rows.length) % rows.length)
    } else if (key.name === "down") {
      setCursor((index) => (index + 1) % rows.length)
    } else if (key.name === "space") {
      toggleRow(rows[cursor])
    } else if (key.name === "a") {
      setAllInTab(!allSelectedInTab)
    } else if (key.name === "escape") {
      onDismiss()
    } else if (key.name === "return" || key.name === "kpenter") {
      onConfirm(buildSelection())
    }
  })

  const totalEnabled =
    enabled.skills.size
    + enabled.mcpServers.size
    + enabled.userTools.size
    + enabled.agentsMd.size
  const totalItems =
    catalog.skills.length
    + catalog.mcpServers.length
    + catalog.userTools.length
    + catalog.agentsMd.length

  const dialogWidth = Math.min(DIALOG_WIDTH, Math.max(28, terminalWidth - 4))
  const innerWidth = dialogWidth - DIALOG_BORDER - DIALOG_PADDING
  const headerLines = 4 + Math.ceil(INSTRUCTIONS.length / innerWidth)
  const chromeLines = headerLines + DIALOG_PADDING + DIALOG_BORDER
  const listHeight = Math.max(
    1,
    Math.min(MAX_VISIBLE_ROWS, Math.max(rows.length, 1), terminalHeight - 2 - chromeLines),
  )
  const dialogHeight = listHeight + chromeLines
  const top = Math.max(1, Math.floor((terminalHeight - dialogHeight) / 2))
  const left = Math.max(1, Math.floor((terminalWidth - dialogWidth) / 2))

  const scrollStart = Math.min(
    Math.max(0, rows.length - listHeight),
    Math.max(0, cursor - Math.floor(listHeight / 2)),
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
        <box flexDirection="row" justifyContent="space-between" width="100%" flexShrink={0}>
          <text fg={AGENT_BORDER_COLOR}>Configure session</text>
          {visibleTabs.length > 1 && (
            <text fg={MUTED_FG}>{`${tabIndex + 1}/${visibleTabs.length}`}</text>
          )}
        </box>
        <text fg={MUTED_FG} flexShrink={0}>{`${totalEnabled} of ${totalItems} enabled`}</text>

        <box flexDirection="row" width="100%" flexShrink={0} marginTop={1}>
          {visibleTabs.map((tab, index) => {
            const active = index === tabIndex
            const count = catalog[tab.kind].length
            const selected = catalog[tab.kind].filter((entry) => enabled[tab.kind].has(entry.name)).length
            const complete = count > 0 && selected === count
            return (
              <text key={tab.kind} fg={active ? ACCENT_FG : MUTED_FG} marginRight={1}>
                {complete && !active ? <span fg={DONE_FG}>✓ </span> : null}
                {active ? "❯ " : "  "}
                {tab.label}
              </text>
            )
          })}
        </box>

        {activeItems.length > 0 && (
          <text fg={MUTED_FG} flexShrink={0} marginTop={1}>
            {`${enabledInTab} of ${activeItems.length} enabled in ${activeTab?.label ?? "tab"}`}
          </text>
        )}

        <text fg={MUTED_FG} flexShrink={0} marginTop={1}>{INSTRUCTIONS}</text>

        <box flexDirection="column" height={listHeight} flexShrink={0} marginTop={1}>
          {rows.length === 0 ? (
            <text fg={MUTED_FG} flexShrink={0}>{EMPTY_MESSAGES[activeKind]}</text>
          ) : (
            visibleRows.map((row, offset) => {
              const index = scrollStart + offset
              const highlighted = index === cursor
              const checked = row.type === "selectAll"
                ? allSelectedInTab
                : enabled[activeKind].has(row.name)
              const label = row.type === "selectAll" ? "Select all" : row.name
              const prefix = `${highlighted ? "❯" : " "} [${checked ? "x" : " "}] `
              const detail = row.type === "item" && row.description
                ? ` — ${row.description.replace(/\s+/g, " ")}`
                : ""
              const line = truncate(`${prefix}${label}${detail}`, innerWidth)
              return (
                <text
                  key={`${activeKind}-${index}`}
                  fg={highlighted ? TEXT_FG : row.type === "selectAll" ? TEXT_FG : MUTED_FG}
                  bg={highlighted ? HIGHLIGHT_BG : undefined}
                  flexShrink={0}
                >
                  {line}
                </text>
              )
            })
          )}
        </box>
      </box>
    </>
  )
}
