import { syntaxStyle } from "../syntax-style"
import { ToolFrame } from "./ToolFrame"
import type { ToolViewProps } from "./types"

type DiffToolViewProps = ToolViewProps & {
  diff: string
  filetype?: string
  subtitle?: string
}

export const DiffToolView = ({
  toolName,
  diff,
  filetype,
  subtitle,
  text,
  isError,
}: DiffToolViewProps) => (
  <ToolFrame title={toolName} subtitle={subtitle ?? (isError ? undefined : text.split("\n")[0])}>
    {isError ? (
      <text fg="#f7768e">{text}</text>
    ) : (
      <diff
        diff={diff}
        view="unified"
        syntaxStyle={syntaxStyle}
        filetype={filetype}
        showLineNumbers={true}
        wrapMode="word"
      />
    )}
  </ToolFrame>
)
