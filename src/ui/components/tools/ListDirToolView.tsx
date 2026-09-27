import type { ToolViewProps } from "../../lib/types"
import { callTitle, readStringField } from "../../lib/utils"
import { ListToolView } from "../primitives/ListToolView"
import { ToolFrame } from "../primitives/ToolFrame"

export const ListDirToolCallView = (props: ToolViewProps) => {
  const path = readStringField(props.input, "path") ?? "."

  return (
    <ToolFrame title={callTitle(props.toolName)} subtitle={path}>
      <text>Listing directory...</text>
    </ToolFrame>
  )
}

export const ListDirToolResultView = (props: ToolViewProps) => {
  const items = props.text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("("))

  return (
    <ListToolView
      {...props}
      items={items}
      subtitle={readStringField(props.input, "path")}
    />
  )
}
