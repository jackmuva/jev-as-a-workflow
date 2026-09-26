import type { ToolViewProps } from "../../lib/types"
import { callTitle, readStringField } from "../../lib/utils"
import { ListToolView } from "../primitives/ListToolView"
import { ToolFrame } from "../primitives/ToolFrame"

export const GlobToolCallView = (props: ToolViewProps) => {
  const pattern = readStringField(props.input, "pattern") ?? ""
  const path = readStringField(props.input, "path") ?? "."

  return (
    <ToolFrame title={callTitle(props.toolName)} subtitle={`${path} · ${pattern}`}>
      <text>Searching files...</text>
    </ToolFrame>
  )
}

export const GlobToolResultView = (props: ToolViewProps) => {
  const items = props.text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("("))

  return (
    <ListToolView
      {...props}
      items={items}
      subtitle={readStringField(props.input, "path") ?? readStringField(props.input, "pattern")}
    />
  )
}
