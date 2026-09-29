import { MouseButton, type MouseEvent } from "@opentui/core"
import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"

export const AGENT_BORDER_COLOR = "#565f89"
export const USER_INPUT_BORDER_COLOR = "#e0af68"
export const TOOL_RESULT_MAX_HEIGHT = 14
const MUTED_FG = "#565f89"
const CALL_LABEL_FG = "#7aa2f7"
const OUTPUT_LABEL_FG = "#9ece6a"

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

  return (
    <box
      border={true}
      borderColor={AGENT_BORDER_COLOR}
      paddingLeft={1}
      marginBottom={1}
      width={width}
    >
      <text>
        {kind === "call" ? <span fg={CALL_LABEL_FG}>{"CALL "}</span> : null}
        {kind === "output" ? <span fg={OUTPUT_LABEL_FG}>{"OUTPUT "}</span> : null}
        {title}
      </text>
      {subtitle ? <text fg="#7aa2f7">{subtitle}</text> : null}
      <box
        width="100%"
        maxHeight={expanded ? undefined : maxHeight}
        overflow={expanded ? undefined : "hidden"}
      >
        {children}
      </box>
      <text fg={MUTED_FG} selectable={false} onMouseDown={handleToggle}>
        {expanded ? "click to collapse" : "click to expand"}
      </text>
    </box>
  )
}
