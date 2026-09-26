import type { ReactNode } from "react"
import { CodeToolView } from "./tool-views/CodeToolView"
import { DefaultToolView } from "./tool-views/DefaultToolView"
import { DiffToolView } from "./tool-views/DiffToolView"
import { ListToolView } from "./tool-views/ListToolView"
import { MarkdownToolView } from "./tool-views/MarkdownToolView"
import { ToolFrame } from "./tool-views/ToolFrame"
import type { ToolRenderContext } from "./tool-views/types"
import {
  buildUnifiedDiff,
  buildWriteDiff,
  filetypeFromPath,
  looksLikeLineNumberedOutput,
  parseLineNumberedContent,
  readStringField,
} from "./tool-views/utils"

type ToolRenderer = (ctx: ToolRenderContext) => ReactNode
type ToolCallRenderer = (ctx: ToolRenderContext) => ReactNode

const stripToolServer = (toolName: string) => toolName.split("/").pop() ?? toolName

const looksLikeMarkdown = (text: string) =>
  /(^|\n)(#{1,6}\s|[-*]\s|\d+\.\s|```|\[.+\]\(.+\))/.test(text)

// --- Result renderers ---

const readResultView: ToolRenderer = (ctx) => {
  const filePath = readStringField(ctx.input, "filePath")
  const filetype = filetypeFromPath(filePath)

  if (looksLikeLineNumberedOutput(ctx.text)) {
    const { content, startLine } = parseLineNumberedContent(ctx.text)
    return (
      <CodeToolView
        {...ctx}
        content={content}
        filetype={filetype}
        subtitle={filePath}
        startLine={startLine}
      />
    )
  }

  const lines = ctx.text.split("\n").filter(Boolean)
  if (lines.length > 1 && !ctx.text.includes(":")) {
    return <ListToolView {...ctx} items={lines} subtitle={filePath ?? "directory listing"} />
  }

  return <CodeToolView {...ctx} content={ctx.text} filetype={filetype} subtitle={filePath} />
}

const bashResultView: ToolRenderer = (ctx) => (
  <CodeToolView
    {...ctx}
    content={ctx.text}
    filetype="bash"
    subtitle={readStringField(ctx.input, "command")}
  />
)

const grepResultView: ToolRenderer = (ctx) => (
  <CodeToolView {...ctx} content={ctx.text} filetype="plaintext" subtitle="grep matches" />
)

const editResultView: ToolRenderer = (ctx) => {
  const filePath = readStringField(ctx.input, "filePath")
  const oldString = readStringField(ctx.input, "oldString")
  const newString = readStringField(ctx.input, "newString")

  if (filePath && oldString != null && newString != null && !ctx.isError) {
    return (
      <DiffToolView
        {...ctx}
        diff={buildUnifiedDiff(filePath, oldString, newString)}
        filetype={filetypeFromPath(filePath)}
        subtitle={filePath}
      />
    )
  }

  return <DefaultToolView {...ctx} />
}

const applyPatchResultView: ToolRenderer = (ctx) => {
  const patchText = readStringField(ctx.input, "patchText")
  if (patchText && !ctx.isError) {
    return (
      <CodeToolView
        {...ctx}
        content={patchText}
        filetype="diff"
        subtitle="applied patch"
      />
    )
  }
  return <DefaultToolView {...ctx} />
}

const writeResultView: ToolRenderer = (ctx) => {
  const filePath = readStringField(ctx.input, "filePath")
  const content = readStringField(ctx.input, "content")

  if (filePath && content != null && !ctx.isError) {
    return (
      <DiffToolView
        {...ctx}
        diff={buildWriteDiff(filePath, content)}
        filetype={filetypeFromPath(filePath)}
        subtitle={filePath}
      />
    )
  }

  return <DefaultToolView {...ctx} />
}

const listResultView: ToolRenderer = (ctx) => {
  const items = ctx.text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("("))

  return (
    <ListToolView
      {...ctx}
      items={items}
      subtitle={readStringField(ctx.input, "path") ?? readStringField(ctx.input, "pattern")}
    />
  )
}

const webFetchResultView: ToolRenderer = (ctx) => {
  const format = readStringField(ctx.input, "format") ?? "markdown"
  const url = readStringField(ctx.input, "url")

  if (format === "markdown" || looksLikeMarkdown(ctx.text)) {
    return <MarkdownToolView {...ctx} content={ctx.text} subtitle={url} />
  }

  if (format === "html") {
    return <CodeToolView {...ctx} content={ctx.text} filetype="html" subtitle={url} />
  }

  return <CodeToolView {...ctx} content={ctx.text} filetype="plaintext" subtitle={url} />
}

const webSearchResultView: ToolRenderer = (ctx) => {
  const query = readStringField(ctx.input, "query")
  if (looksLikeMarkdown(ctx.text)) {
    return <MarkdownToolView {...ctx} content={ctx.text} subtitle={query} />
  }
  return <MarkdownToolView {...ctx} content={ctx.text} subtitle={query} />
}

const smartDefaultResultView: ToolRenderer = (ctx) => {
  if (ctx.isError) return <DefaultToolView {...ctx} />
  if (looksLikeMarkdown(ctx.text) && ctx.text.length > 120) {
    return <MarkdownToolView {...ctx} content={ctx.text} />
  }
  if (ctx.text.includes("\n") && ctx.text.length > 80) {
    return <CodeToolView {...ctx} content={ctx.text} filetype="plaintext" />
  }
  return <DefaultToolView {...ctx} />
}

const toolResultRenderers: Record<string, ToolRenderer> = {
  "default/read": readResultView,
  "default/bash": bashResultView,
  "default/grep": grepResultView,
  "default/edit": editResultView,
  "default/apply_patch": applyPatchResultView,
  "default/write": writeResultView,
  "default/glob": listResultView,
  "default/list_dir": listResultView,
  "default/webfetch": webFetchResultView,
  "default/websearch": webSearchResultView,
}

// --- Call renderers ---

const readCallView: ToolCallRenderer = (ctx) => {
  const filePath = readStringField(ctx.input, "filePath") ?? "unknown file"
  const offset = ctx.input && typeof ctx.input === "object" && "offset" in ctx.input
    ? String((ctx.input as Record<string, unknown>).offset ?? 1)
    : "1"
  const limit = ctx.input && typeof ctx.input === "object" && "limit" in ctx.input
    ? String((ctx.input as Record<string, unknown>).limit ?? 2000)
    : "2000"

  return (
    <ToolFrame title={`▶ ${ctx.toolName}`} subtitle={`${filePath} (offset ${offset}, limit ${limit})`}>
      <text>Reading file...</text>
    </ToolFrame>
  )
}

const bashCallView: ToolCallRenderer = (ctx) => {
  const command = readStringField(ctx.input, "command") ?? ""
  const workdir = readStringField(ctx.input, "workdir")

  return (
    <CodeToolView
      {...ctx}
      toolName={`▶ ${ctx.toolName}`}
      content={command}
      filetype="bash"
      subtitle={workdir ? `cwd: ${workdir}` : undefined}
    />
  )
}

const editCallView: ToolCallRenderer = (ctx) => {
  const filePath = readStringField(ctx.input, "filePath")
  const oldString = readStringField(ctx.input, "oldString")
  const newString = readStringField(ctx.input, "newString")

  if (filePath && oldString != null && newString != null) {
    return (
      <DiffToolView
        {...ctx}
        toolName={`▶ ${ctx.toolName}`}
        diff={buildUnifiedDiff(filePath, oldString, newString)}
        filetype={filetypeFromPath(filePath)}
        subtitle={filePath}
        text=""
      />
    )
  }

  return <DefaultToolView {...ctx} toolName={`▶ ${ctx.toolName}`} />
}

const applyPatchCallView: ToolCallRenderer = (ctx) => {
  const patchText = readStringField(ctx.input, "patchText") ?? ""
  return (
    <CodeToolView
      {...ctx}
      toolName={`▶ ${ctx.toolName}`}
      content={patchText}
      filetype="diff"
      subtitle="patch preview"
    />
  )
}

const writeCallView: ToolCallRenderer = (ctx) => {
  const filePath = readStringField(ctx.input, "filePath")
  const content = readStringField(ctx.input, "content") ?? ""

  return (
    <CodeToolView
      {...ctx}
      toolName={`▶ ${ctx.toolName}`}
      content={content}
      filetype={filetypeFromPath(filePath)}
      subtitle={filePath}
    />
  )
}

const grepCallView: ToolCallRenderer = (ctx) => {
  const pattern = readStringField(ctx.input, "pattern") ?? ""
  const path = readStringField(ctx.input, "path")
  const include = readStringField(ctx.input, "include")

  const subtitle = [path && `path: ${path}`, include && `include: ${include}`]
    .filter(Boolean)
    .join(" · ")

  return (
    <CodeToolView
      {...ctx}
      toolName={`▶ ${ctx.toolName}`}
      content={pattern}
      filetype="plaintext"
      subtitle={subtitle || "pattern search"}
    />
  )
}

const globCallView: ToolCallRenderer = (ctx) => {
  const pattern = readStringField(ctx.input, "pattern") ?? ""
  const path = readStringField(ctx.input, "path") ?? "."

  return (
    <ToolFrame title={`▶ ${ctx.toolName}`} subtitle={`${path} · ${pattern}`}>
      <text>Searching files...</text>
    </ToolFrame>
  )
}

const listDirCallView: ToolCallRenderer = (ctx) => {
  const path = readStringField(ctx.input, "path") ?? "."
  return (
    <ToolFrame title={`▶ ${ctx.toolName}`} subtitle={path}>
      <text>Listing directory...</text>
    </ToolFrame>
  )
}

const webFetchCallView: ToolCallRenderer = (ctx) => {
  const url = readStringField(ctx.input, "url") ?? ""
  const format = readStringField(ctx.input, "format") ?? "markdown"
  return (
    <ToolFrame title={`▶ ${ctx.toolName}`} subtitle={`${url} (${format})`}>
      <text>Fetching URL...</text>
    </ToolFrame>
  )
}

const webSearchCallView: ToolCallRenderer = (ctx) => {
  const query = readStringField(ctx.input, "query") ?? ""
  return (
    <ToolFrame title={`▶ ${ctx.toolName}`} subtitle={query}>
      <text>Searching the web...</text>
    </ToolFrame>
  )
}

const defaultCallView: ToolCallRenderer = (ctx) => {
  const summary = ctx.input != null
    ? JSON.stringify(ctx.input, null, 2)
    : ""

  if (summary.includes("\n") || summary.length > 80) {
    return (
      <CodeToolView
        {...ctx}
        toolName={`▶ ${ctx.toolName}`}
        content={summary}
        filetype="json"
      />
    )
  }

  return (
    <ToolFrame title={`▶ ${ctx.toolName}`} subtitle={summary || undefined}>
      <text>Running tool...</text>
    </ToolFrame>
  )
}

const toolCallRenderers: Record<string, ToolCallRenderer> = {
  "default/read": readCallView,
  "default/bash": bashCallView,
  "default/grep": grepCallView,
  "default/edit": editCallView,
  "default/apply_patch": applyPatchCallView,
  "default/write": writeCallView,
  "default/glob": globCallView,
  "default/list_dir": listDirCallView,
  "default/webfetch": webFetchCallView,
  "default/websearch": webSearchCallView,
  AskQuestion: (ctx) => {
    const questions = ctx.input && typeof ctx.input === "object" && "questions" in ctx.input
      ? (ctx.input as { questions?: Array<{ prompt?: string }> }).questions
      : undefined
    const prompts = questions?.map((q) => q.prompt).filter(Boolean) as string[] | undefined

    return (
      <ListToolView
        {...ctx}
        toolName={`▶ ${ctx.toolName}`}
        items={prompts ?? ["Clarifying question"]}
        subtitle="awaiting answer"
        text=""
      />
    )
  },
}

const lookupRenderer = <T extends ToolRenderer | ToolCallRenderer>(
  registry: Record<string, T>,
  toolName: string,
): T | undefined =>
  registry[toolName] ?? registry[`default/${stripToolServer(toolName)}`]

export const renderToolResult = (ctx: ToolRenderContext): ReactNode => {
  const renderer = lookupRenderer(toolResultRenderers, ctx.toolName) ?? smartDefaultResultView
  return renderer(ctx)
}

export const renderToolCall = (ctx: ToolRenderContext): ReactNode => {
  const renderer = lookupRenderer(toolCallRenderers, ctx.toolName) ?? defaultCallView
  return renderer(ctx)
}
