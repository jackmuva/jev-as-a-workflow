import { createElement, type ComponentType, type ReactNode } from "react"
import type { ToolViewProps } from "./lib/types"
import { ApplyPatchToolCallView, ApplyPatchToolResultView } from "./tools/ApplyPatchToolView"
import { AskQuestionToolCallView } from "./tools/AskQuestionToolView"
import { BashToolCallView, BashToolResultView } from "./tools/BashToolView"
import { DefaultToolCallView, SmartDefaultToolResultView } from "./tools/DefaultToolViews"
import { EditToolCallView, EditToolResultView } from "./tools/EditToolView"
import { GlobToolCallView, GlobToolResultView } from "./tools/GlobToolView"
import { GrepToolCallView, GrepToolResultView } from "./tools/GrepToolView"
import { ListDirToolCallView, ListDirToolResultView } from "./tools/ListDirToolView"
import { ReadToolCallView, ReadToolResultView } from "./tools/ReadToolView"
import { WebFetchToolCallView, WebFetchToolResultView } from "./tools/WebFetchToolView"
import { WebSearchToolCallView, WebSearchToolResultView } from "./tools/WebSearchToolView"
import { WriteToolCallView, WriteToolResultView } from "./tools/WriteToolView"

type ToolComponent = ComponentType<ToolViewProps>

const stripToolServer = (toolName: string) => toolName.split("/").pop() ?? toolName

const toolResultComponents: Record<string, ToolComponent> = {
  "default/read": ReadToolResultView,
  "default/bash": BashToolResultView,
  "default/grep": GrepToolResultView,
  "default/edit": EditToolResultView,
  "default/apply_patch": ApplyPatchToolResultView,
  "default/write": WriteToolResultView,
  "default/glob": GlobToolResultView,
  "default/list_dir": ListDirToolResultView,
  "default/webfetch": WebFetchToolResultView,
  "default/websearch": WebSearchToolResultView,
}

const toolCallComponents: Record<string, ToolComponent> = {
  "default/read": ReadToolCallView,
  "default/bash": BashToolCallView,
  "default/grep": GrepToolCallView,
  "default/edit": EditToolCallView,
  "default/apply_patch": ApplyPatchToolCallView,
  "default/write": WriteToolCallView,
  "default/glob": GlobToolCallView,
  "default/list_dir": ListDirToolCallView,
  "default/webfetch": WebFetchToolCallView,
  "default/websearch": WebSearchToolCallView,
  AskQuestion: AskQuestionToolCallView,
}

const lookupComponent = (
  registry: Record<string, ToolComponent>,
  toolName: string,
): ToolComponent | undefined =>
  registry[toolName] ?? registry[`default/${stripToolServer(toolName)}`]

export const renderToolResult = (ctx: ToolViewProps): ReactNode => {
  const Component = lookupComponent(toolResultComponents, ctx.toolName) ?? SmartDefaultToolResultView
  return createElement(Component, ctx)
}

export const renderToolCall = (ctx: ToolViewProps): ReactNode => {
  const Component = lookupComponent(toolCallComponents, ctx.toolName) ?? DefaultToolCallView
  return createElement(Component, ctx)
}
