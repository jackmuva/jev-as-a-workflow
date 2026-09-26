import { syntaxStyle } from "../syntax-style"
import { ToolFrame } from "./ToolFrame"
import type { ToolViewProps } from "./types"

type CodeToolViewProps = ToolViewProps & {
  content: string
  filetype?: string
  subtitle?: string
  startLine?: number
}

export const CodeToolView = ({
  toolName,
  content,
  filetype = "plaintext",
  subtitle,
  startLine = 1,
  isError,
}: CodeToolViewProps) => (
  <ToolFrame title={toolName} subtitle={subtitle}>
    {isError ? (
      <text fg="#f7768e">{content}</text>
    ) : (
      <line-number
        fg="#565f89"
        minWidth={3}
        paddingRight={1}
        showLineNumbers={true}
        lineNumberOffset={startLine - 1}
        width="100%"
      >
        <code
          content={content}
          filetype={filetype}
          syntaxStyle={syntaxStyle}
          width="100%"
        />
      </line-number>
    )}
  </ToolFrame>
)
