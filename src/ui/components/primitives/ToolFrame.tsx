import { MouseButton, type MouseEvent } from "@opentui/core"
import type { ReactNode } from "react"
import { useState } from "react"

export const AGENT_BORDER_COLOR = "#565f89"
export const TOOL_RESULT_MAX_HEIGHT = 14
const MUTED_FG = "#565f89"

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

  const handleToggle = (event: MouseEvent) => {
    if (event.button !== MouseButton.LEFT) return
    event.preventDefault()
    setExpanded((value) => !value)
  }

  return (
    <box
      border={true}
      borderColor={AGENT_BORDER_COLOR}
      paddingLeft={1}
      marginBottom={1}
      width={width}
    >
      <text>{title}</text>
      {subtitle ? <text fg="#7aa2f7">{subtitle}</text> : null}
      <box
        width="100%"
        height={expanded ? "auto" : maxHeight}
        // overflow={expanded ? undefined : "hidden"}
      >
        {children}
      </box>
      <text fg={MUTED_FG} selectable={false} onMouseDown={handleToggle}>
        {expanded ? "click to collapse" : "click to expand"}
      </text>
    </box>
  )
}
