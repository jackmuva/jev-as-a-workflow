import type { ToolViewProps } from "../../../models/ui"
import { AGENT_BORDER_COLOR } from "../primitives/ToolFrame"
import { syntaxStyle } from "../../syntax-style"

export const MessageAnswerToolResultView = (props: ToolViewProps) => (
  <box
    border={["left"]}
    borderColor={AGENT_BORDER_COLOR}
    paddingLeft={1}
    marginBottom={1}
    width="100%"
  >
    {props.isError ? (
      <text fg="#f7768e">{props.text}</text>
    ) : (
      <markdown content={props.text} syntaxStyle={syntaxStyle} />
    )}
  </box>
)
