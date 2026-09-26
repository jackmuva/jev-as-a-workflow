import type { ReactNode } from "react"

export const AGENT_BORDER_COLOR = "#565f89"
export const TOOL_RESULT_MAX_HEIGHT = 14

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
}: ToolFrameProps) => (
  <box
    border={true}
    borderColor={AGENT_BORDER_COLOR}
    paddingLeft={1}
    marginBottom={1}
    width={width}
  >
    <text>{title}</text>
    {subtitle ? <text fg="#7aa2f7">{subtitle}</text> : null}
    <scrollbox height={maxHeight} width="100%">
      {children}
    </scrollbox>
  </box>
)
