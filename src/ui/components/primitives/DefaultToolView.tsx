import { MessageFrame } from "./MessageFrame"
import type { ToolViewProps } from "../../../models/ui"

export const DefaultToolView = ({ toolName, text, isError }: ToolViewProps) => (
  <MessageFrame title={toolName}>
    <text fg={isError ? "#f7768e" : undefined}>{text}</text>
  </MessageFrame>
)
