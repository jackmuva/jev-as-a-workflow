import type { ToolViewProps } from "../../lib/types"
import { callTitle, readStringField } from "../../lib/utils"
import { CodeToolView } from "../primitives/CodeToolView"

export const BashToolCallView = (props: ToolViewProps) => {
  const command = readStringField(props.input, "command") ?? ""
  const workdir = readStringField(props.input, "workdir")

  return (
    <CodeToolView
      {...props}
      toolName={callTitle(props.toolName)}
      content={command}
      filetype="bash"
      subtitle={workdir ? `cwd: ${workdir}` : undefined}
    />
  )
}

export const BashToolResultView = (props: ToolViewProps) => (
  <CodeToolView
    {...props}
    content={props.text}
    filetype="bash"
    subtitle={readStringField(props.input, "command")}
  />
)
