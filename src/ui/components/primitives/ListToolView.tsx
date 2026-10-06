import type { ToolViewProps } from "../../../models/ui"
import { MessageFrame } from "./MessageFrame"

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
  <MessageFrame title={toolName} subtitle={subtitle}>
    {isError ? (
      <text fg="#f7768e">{text}</text>
    ) : (
      <>
        {items.map((item, index) => (
          <text key={index}>• {item}</text>
        ))}
      </>
    )}
  </MessageFrame>
)
