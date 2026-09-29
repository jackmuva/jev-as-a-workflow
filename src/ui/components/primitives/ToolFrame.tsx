import { MouseButton, type MouseEvent } from "@opentui/core"
import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"
import { WorkflowEdge } from "./WorkflowEdge"

export const AGENT_BORDER_COLOR = "#565f89"
export const USER_INPUT_BORDER_COLOR = "#e0af68"
export const TOOL_RESULT_MAX_HEIGHT = 14
const MUTED_FG = "#565f89"
const CALL_LABEL_FG = "#7aa2f7"
const OUTPUT_LABEL_FG = "#9ece6a"

const NODE_LABEL: Record<ToolFrameKind, string> = {
  call: "● CALL",
  output: "■ OUTPUT",
}

export type ToolFrameKind = "call" | "output"

export const ToolFrameKindContext = createContext<ToolFrameKind | undefined>(undefined)

type ToolFrameProps = {
  title: string
  subtitle?: string
  children: ReactNode
  maxHeight?: number
  width?: `${number}%` | number | "auto"
}

export const ToolFrame = ({
  title,
  subtitle,
  children,
  maxHeight = TOOL_RESULT_MAX_HEIGHT,
  width = "75%" as const,
}: ToolFrameProps) => {
  const [expanded, setExpanded] = useState(false)
  const kind = useContext(ToolFrameKindContext)

  const handleToggle = (event: MouseEvent) => {
    if (event.button !== MouseButton.LEFT) return
    event.preventDefault()
    setExpanded((value) => !value)
  }

  const accent = kind === "call" ? CALL_LABEL_FG : kind === "output" ? OUTPUT_LABEL_FG : AGENT_BORDER_COLOR
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
