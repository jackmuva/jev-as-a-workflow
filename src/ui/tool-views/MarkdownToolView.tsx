import { syntaxStyle } from "../syntax-style"
import { ToolFrame } from "./ToolFrame"
import type { ToolViewProps } from "./types"

type MarkdownToolViewProps = ToolViewProps & {
  content: string
  subtitle?: string
}

export const MarkdownToolView = ({
  toolName,
  content,
  subtitle,
  isError,
}: MarkdownToolViewProps) => (
  <ToolFrame title={toolName} subtitle={subtitle}>
    {isError ? (
      <text fg="#f7768e">{content}</text>
    ) : (
      <markdown content={content} syntaxStyle={syntaxStyle} />
    )}
  </ToolFrame>
)
