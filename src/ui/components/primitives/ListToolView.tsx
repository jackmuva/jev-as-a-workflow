import type { ToolViewProps } from "../../lib/types"
import { ToolFrame } from "./ToolFrame"

type ListToolViewProps = ToolViewProps & {
  items: string[]
  subtitle?: string
}

export const ListToolView = ({
  toolName,
  items,
  subtitle,
  text,
  isError,
}: ListToolViewProps) => (
  <ToolFrame title={toolName} subtitle={subtitle}>
    {isError ? (
      <text fg="#f7768e">{text}</text>
    ) : (
      <>
        {items.map((item, index) => (
          <text key={index}>• {item}</text>
        ))}
      </>
    )}
  </ToolFrame>
)
