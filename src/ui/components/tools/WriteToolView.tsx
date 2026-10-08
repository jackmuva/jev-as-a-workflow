import type { ToolViewProps } from "../../../models/ui"
import {
  buildWriteDiff,
  callTitle,
  filetypeFromPath,
  readStringField,
} from "../../lib/format/message"
import { CodeToolView } from "../primitives/CodeToolView"
import { DefaultToolView } from "../primitives/DefaultToolView"
import { DiffToolView } from "../primitives/DiffToolView"

export const WriteToolCallView = (props: ToolViewProps) => {
  const filePath = readStringField(props.input, "filePath")
  const content = readStringField(props.input, "content") ?? ""

  return (
    <CodeToolView
      {...props}
      toolName={callTitle(props.toolName)}
      content={content}
      filetype={filetypeFromPath(filePath)}
      subtitle={filePath}
    />
  )
}

export const WriteToolResultView = (props: ToolViewProps) => {
  const filePath = readStringField(props.input, "filePath")
  const content = readStringField(props.input, "content")

  if (filePath && content != null && !props.isError) {
    return (
      <DiffToolView
        {...props}
        diff={buildWriteDiff(filePath, content)}
        filetype={filetypeFromPath(filePath)}
        subtitle={filePath}
      />
    )
  }

  return <DefaultToolView {...props} />
}
