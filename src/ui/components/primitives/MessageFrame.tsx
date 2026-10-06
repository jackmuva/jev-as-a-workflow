import { MouseButton, type MouseEvent } from "@opentui/core"
import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"
import { WorkflowEdge } from "./WorkflowEdge"

export const AGENT_BORDER_COLOR = "#565f89"
export const USER_INPUT_BORDER_COLOR = "#e0af68"
export const SUMMARY_BORDER_COLOR = "#bb9af7"
export const WORKFLOW_BORDER_COLOR = "#7dcfff"
export const MESSAGE_FRAME_MAX_HEIGHT = 14
const MUTED_FG = "#565f89"
const CALL_LABEL_FG = "#7aa2f7"
const OUTPUT_LABEL_FG = "#9ece6a"

const NODE_LABEL: Record<MessageFrameKind, string> = {
  call: "● CALL",
  output: "■ OUTPUT",
  summary: "◆ SUMMARY",
  attachment: "◇ ATTACH",
  workflow: "▶ WORKFLOW",
}

export type MessageFrameKind = "call" | "output" | "summary" | "attachment" | "workflow"

export const MessageFrameKindContext = createContext<MessageFrameKind | undefined>(undefined)

type MessageFrameProps = {
  title: string
  subtitle?: string
  children: ReactNode
  maxHeight?: number
  width?: `${number}%` | number | "auto"
}

export const MessageFrame = ({
  title,
  subtitle,
  children,
  maxHeight = MESSAGE_FRAME_MAX_HEIGHT,
  width = "75%" as const,
}: MessageFrameProps) => {
  const [expanded, setExpanded] = useState(false)
  const kind = useContext(MessageFrameKindContext)

  const handleToggle = (event: MouseEvent) => {
    if (event.button !== MouseButton.LEFT) return
    event.preventDefault()
    setExpanded((value) => !value)
  }

  const accent = kind === "call"
    ? CALL_LABEL_FG
    : kind === "output"
      ? OUTPUT_LABEL_FG
      : kind === "summary"
        ? SUMMARY_BORDER_COLOR
        : kind === "attachment"
          ? USER_INPUT_BORDER_COLOR
          : kind === "workflow"
            ? WORKFLOW_BORDER_COLOR
            : AGENT_BORDER_COLOR
  const label = kind ? `${NODE_LABEL[kind]} · ` : ""

  return (
    <box flexDirection="column" flexShrink={0} width={width}>
      <WorkflowEdge />
      <box
        border={true}
        borderStyle="rounded"
        borderColor={accent}
        title={` ${label}${title} `}
        titleColor={accent}
        paddingLeft={1}
        paddingRight={1}
        width="100%"
      >
        {subtitle ? <text fg={MUTED_FG}>{subtitle}</text> : null}
        <box
          width="100%"
          maxHeight={expanded ? undefined : maxHeight}
          overflow={expanded ? undefined : "hidden"}
        >
          {children}
        </box>
        <text fg={MUTED_FG} selectable={false} onMouseDown={handleToggle}>
          {expanded ? "▴ collapse" : "▾ expand"}
        </text>
      </box>
    </box>
  )
}
