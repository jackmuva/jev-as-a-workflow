import type { ToolViewProps } from "../lib/types"
import { callTitle, looksLikeMarkdown, readStringField } from "../lib/utils"
import { CodeToolView } from "../primitives/CodeToolView"
import { MarkdownToolView } from "../primitives/MarkdownToolView"
import { ToolFrame } from "../primitives/ToolFrame"

export const WebFetchToolCallView = (props: ToolViewProps) => {
  const url = readStringField(props.input, "url") ?? ""
  const format = readStringField(props.input, "format") ?? "markdown"

  return (
    <ToolFrame title={callTitle(props.toolName)} subtitle={`${url} (${format})`}>
      <text>Fetching URL...</text>
    </ToolFrame>
  )
}

export const WebFetchToolResultView = (props: ToolViewProps) => {
  const format = readStringField(props.input, "format") ?? "markdown"
  const url = readStringField(props.input, "url")

  if (format === "markdown" || looksLikeMarkdown(props.text)) {
    return <MarkdownToolView {...props} content={props.text} subtitle={url} />
  }

  if (format === "html") {
    return (
      <CodeToolView
        {...props}
        content={props.text}
        filetype="html"
        subtitle={url}
      />
    )
  }

  return (
    <CodeToolView
      {...props}
      content={props.text}
      filetype="plaintext"
      subtitle={url}
    />
  )
}
