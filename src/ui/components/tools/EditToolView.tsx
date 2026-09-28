import type { ToolViewProps } from "../../../models/ui"
import {
  buildUnifiedDiff,
  callTitle,
  filetypeFromPath,
  readStringField,
} from "../../lib/format/utils"
import { DefaultToolView } from "../primitives/DefaultToolView"
import { DiffToolView } from "../primitives/DiffToolView"

export const EditToolCallView = (props: ToolViewProps) => {
  const filePath = readStringField(props.input, "filePath")
  const oldString = readStringField(props.input, "oldString")
  const newString = readStringField(props.input, "newString")

  if (filePath && oldString != null && newString != null) {
    return (
      <DiffToolView
        {...props}
        toolName={callTitle(props.toolName)}
        diff={buildUnifiedDiff(filePath, oldString, newString)}
        filetype={filetypeFromPath(filePath)}
        subtitle={filePath}
        text=""
      />
    )
  }

  return <DefaultToolView {...props} toolName={callTitle(props.toolName)} />
}

export const EditToolResultView = (props: ToolViewProps) => {
  const filePath = readStringField(props.input, "filePath")
  const oldString = readStringField(props.input, "oldString")
  const newString = readStringField(props.input, "newString")

  if (filePath && oldString != null && newString != null && !props.isError) {
    return (
      <DiffToolView
        {...props}
        diff={buildUnifiedDiff(filePath, oldString, newString)}
        filetype={filetypeFromPath(filePath)}
        subtitle={filePath}
      />
    )
  }

  return <DefaultToolView {...props} />
}
