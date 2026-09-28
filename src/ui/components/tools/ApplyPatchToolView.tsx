import type { ToolViewProps } from "../../../models/ui"
import { callTitle, readStringField } from "../../lib/format/utils"
import { CodeToolView } from "../primitives/CodeToolView"
import { DefaultToolView } from "../primitives/DefaultToolView"

export const ApplyPatchToolCallView = (props: ToolViewProps) => {
  const patchText = readStringField(props.input, "patchText") ?? ""

  return (
    <CodeToolView
      {...props}
      toolName={callTitle(props.toolName)}
      content={patchText}
      filetype="diff"
      subtitle="patch preview"
    />
  )
}

export const ApplyPatchToolResultView = (props: ToolViewProps) => {
  const patchText = readStringField(props.input, "patchText")

  if (patchText && !props.isError) {
    return (
      <CodeToolView
        {...props}
        content={patchText}
        filetype="diff"
        subtitle="applied patch"
      />
    )
  }

  return <DefaultToolView {...props} />
}
