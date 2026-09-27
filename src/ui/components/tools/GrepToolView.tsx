import type { ToolViewProps } from "../../lib/types"
import { callTitle, readStringField } from "../../lib/utils"
import { CodeToolView } from "../primitives/CodeToolView"

export const GrepToolCallView = (props: ToolViewProps) => {
  const pattern = readStringField(props.input, "pattern") ?? ""
  const path = readStringField(props.input, "path")
  const include = readStringField(props.input, "include")

  const subtitle = [path && `path: ${path}`, include && `include: ${include}`]
    .filter(Boolean)
    .join(" · ")

  return (
    <CodeToolView
      {...props}
      toolName={callTitle(props.toolName)}
      content={pattern}
      filetype="plaintext"
      subtitle={subtitle || "pattern search"}
    />
  )
}

export const GrepToolResultView = (props: ToolViewProps) => (
  <CodeToolView
    {...props}
    content={props.text}
    filetype="plaintext"
    subtitle="grep matches"
  />
)
