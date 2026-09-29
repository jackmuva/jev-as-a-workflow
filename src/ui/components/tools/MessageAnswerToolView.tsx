import type { ToolViewProps } from "../../../models/ui"
import { callTitle, readStringField } from "../../lib/format/utils"
import { MarkdownToolView } from "../primitives/MarkdownToolView"
import { ToolFrame } from "../primitives/ToolFrame"

const renderAnswerView = (
  props: ToolViewProps,
  answer: string,
  title: string,
) => (
  <MarkdownToolView
    {...props}
    toolName={title}
    content={answer}
  />
)

export const MessageAnswerToolCallView = (props: ToolViewProps) => {
  const answer = readStringField(props.input, "answer") ?? ""

  if (answer) {
    return renderAnswerView(
      { ...props, text: "" },
      answer,
      callTitle(props.toolName),
    )
  }

  return (
    <ToolFrame title={callTitle(props.toolName)}>
      <text>Preparing answer...</text>
    </ToolFrame>
  )
}

export const MessageAnswerToolResultView = (props: ToolViewProps) => {
  const answer = props.text || readStringField(props.input, "answer") || ""
  return renderAnswerView(props, answer, callTitle(props.toolName))
}
