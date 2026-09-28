import { ToolFrame } from "./ToolFrame"
import type { ToolViewProps } from "../../../models/ui"

export const DefaultToolView = ({ toolName, text, isError }: ToolViewProps) => (
  <ToolFrame title={toolName}>
    <text fg={isError ? "#f7768e" : undefined}>{text}</text>
  </ToolFrame>
)
