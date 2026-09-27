import type { ToolViewProps } from "../../lib/types"
import { callTitle, readStringField } from "../../lib/utils"
import { MarkdownToolView } from "../primitives/MarkdownToolView"
import { ToolFrame } from "../primitives/ToolFrame"

export const WebSearchToolCallView = (props: ToolViewProps) => {
  const query = readStringField(props.input, "query") ?? ""

  return (
    <ToolFrame title={callTitle(props.toolName)} subtitle={query}>
      <text>Searching the web...</text>
    </ToolFrame>
  )
}

export const WebSearchToolResultView = (props: ToolViewProps) => (
  <MarkdownToolView
    {...props}
    content={props.text}
    subtitle={readStringField(props.input, "query")}
  />
)
