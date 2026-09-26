import type { ToolViewProps } from "../lib/types"
import { callTitle, looksLikeMarkdown } from "../lib/utils"
import { CodeToolView } from "../primitives/CodeToolView"
import { DefaultToolView } from "../primitives/DefaultToolView"
import { MarkdownToolView } from "../primitives/MarkdownToolView"
import { ToolFrame } from "../primitives/ToolFrame"

export const DefaultToolCallView = (props: ToolViewProps) => {
  const summary = props.input != null
    ? JSON.stringify(props.input, null, 2)
    : ""

  if (summary.includes("\n") || summary.length > 80) {
    return (
      <CodeToolView
        {...props}
        toolName={callTitle(props.toolName)}
        content={summary}
        filetype="json"
      />
    )
  }

  return (
    <ToolFrame title={callTitle(props.toolName)} subtitle={summary || undefined}>
      <text>Running tool...</text>
    </ToolFrame>
  )
}

export const SmartDefaultToolResultView = (props: ToolViewProps) => {
  if (props.isError) return <DefaultToolView {...props} />
  if (looksLikeMarkdown(props.text) && props.text.length > 120) {
    return <MarkdownToolView {...props} content={props.text} />
  }
  if (props.text.includes("\n") && props.text.length > 80) {
    return (
      <CodeToolView
        {...props}
        content={props.text}
        filetype="plaintext"
      />
    )
  }
  return <DefaultToolView {...props} />
}
