import type { SelectOption } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useMemo, useState } from "react"
import type { WorkflowRecord } from "../../../models/workflow"
import { AGENT_BORDER_COLOR } from "../primitives/ToolFrame"

const MAX_VISIBLE_ITEMS = 6
const DIALOG_WIDTH = 56
const DIALOG_PADDING = 2
const DIALOG_BORDER = 2
const INSTRUCTIONS = "↑/↓ to navigate · Enter to select · Esc to dismiss"

type WorkflowSelectionDialogProps = {
  workflows: WorkflowRecord[]
  onSelect: (workflowId: string) => void
  onDismiss: () => void
  terminalWidth: number
  terminalHeight: number
}

const formatWorkflowLabel = (workflow: WorkflowRecord) =>
  workflow.title.trim() || "Untitled workflow"

const formatWorkflowDescription = (workflow: WorkflowRecord) => {
  const updated = new Date(workflow.updatedAt).toLocaleString()
  const stepCount = workflow.steps.length
  return `${stepCount} step${stepCount === 1 ? "" : "s"} · Updated ${updated}`
}

export const WorkflowSelectionDialog = ({
  workflows,
  onSelect,
  onDismiss,
  terminalWidth,
  terminalHeight,
}: WorkflowSelectionDialogProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useKeyboard((key) => {
    if (workflows.length === 0) {
      if (key.name === "escape" || key.name === "return" || key.name === "kpenter") {
        onDismiss()
      }
      return
    }

    if (key.name === "up") {
      setSelectedIndex((index) => (index - 1 + workflows.length) % workflows.length)
      return
    }

    if (key.name === "down") {
      setSelectedIndex((index) => (index + 1) % workflows.length)
      return
    }

    if (key.name === "return" || key.name === "kpenter") {
      const workflow = workflows[selectedIndex]
      if (workflow) onSelect(workflow.id)
      return
    }

    if (key.name === "escape") {
      onDismiss()
    }
  })

  const options: SelectOption[] = useMemo(
    () =>
      workflows.map((workflow) => ({
        name: formatWorkflowLabel(workflow),
        description: formatWorkflowDescription(workflow),
        value: workflow.id,
      })),
    [workflows],
  )

  const dialogWidth = Math.min(DIALOG_WIDTH, Math.max(24, terminalWidth - 4))
  const innerWidth = dialogWidth - DIALOG_BORDER - DIALOG_PADDING
  const headerLines = 1 + Math.ceil(INSTRUCTIONS.length / innerWidth)
  const chromeLines = headerLines + DIALOG_PADDING + DIALOG_BORDER

  const linesPerItem = 2
  const maxListHeight = Math.max(linesPerItem, terminalHeight - 2 - chromeLines)
  const listHeight = Math.min(
    MAX_VISIBLE_ITEMS * linesPerItem,
    maxListHeight,
    Math.max(linesPerItem, options.length * linesPerItem),
  )
  const bodyHeight = workflows.length === 0 ? 1 : listHeight
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
        <text fg={AGENT_BORDER_COLOR} flexShrink={0}>Run workflow</text>
        <text fg="#565f89" flexShrink={0}>{INSTRUCTIONS}</text>
        {workflows.length === 0 ? (
          <text fg="#565f89" flexShrink={0}>No saved workflows for this workspace</text>
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
