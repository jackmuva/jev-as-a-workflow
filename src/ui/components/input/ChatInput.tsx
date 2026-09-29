import type { KeyBinding, TextareaRenderable } from "@opentui/core"
import { useEffect, useRef, useState } from "react"
import { listWorkspaceFiles } from "../../lib/input-completion/at-files"
import { useInputCompletion } from "../../hooks/useInputCompletion"
import type { SlashCommandActions } from "../../lib/input-completion/slash-commands"
import type { CompletionState } from "../../../models/ui"

const chatKeyBindings: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "kpenter", action: "submit" },
  { name: "kpenter", shift: true, action: "newline" },
  { name: "linefeed", action: "submit" },
  { name: "linefeed", shift: true, action: "newline" },
]

const MAX_INPUT_LINES = 8

type ChatInputProps = {
  disabled?: boolean
  placeholder?: string
  marginY?: number
  slashCommandHandlers: SlashCommandActions
  onCompletionChange?: (completion: CompletionState) => void
  onSubmit: (text: string) => void | Promise<void>
}

export const ChatInput = ({
  disabled = false,
  placeholder = "What would you like to do",
  marginY = 0,
  slashCommandHandlers,
  onCompletionChange,
  onSubmit,
}: ChatInputProps) => {
  const textareaRef = useRef<TextareaRenderable>(null)
  const {
    completion,
    syncCompletion,
    handleKeyDown,
    handleSubmitAttempt,
  } = useInputCompletion({ textareaRef, disabled, slashCommandActions: slashCommandHandlers })

  const [lineCount, setLineCount] = useState(1)

  // Textarea has no intrinsic height, so size it to its (wrapped) content.
  const syncHeight = () => {
    const textarea = textareaRef.current
    // virtualLineCount (wrapped rows) lags behind edits until the next layout, so take the larger.
    const lines = Math.max(textarea?.lineCount ?? 1, textarea?.virtualLineCount ?? 1)
    setLineCount(Math.min(Math.max(lines, 1), MAX_INPUT_LINES))
  }

  const handleContentChange = () => {
    syncHeight()
    syncCompletion()
  }

  useEffect(() => {
    void listWorkspaceFiles()
  }, [])

  useEffect(() => {
    onCompletionChange?.(completion)
  }, [completion, onCompletionChange])

  const handleSubmit = async () => {
    if (disabled) return
    if (!handleSubmitAttempt()) return

    const text = textareaRef.current?.plainText.trim()
    if (!text) return

    textareaRef.current?.clear()
    syncHeight()
    await onSubmit(text)
  }

  return (
    <textarea
      ref={textareaRef}
      marginY={marginY}
      height={lineCount}
      flexShrink={0}
      placeholder={placeholder}
      keyBindings={chatKeyBindings}
      onSubmit={handleSubmit}
      onContentChange={handleContentChange}
      onCursorChange={handleContentChange}
      onKeyDown={handleKeyDown}
      focused={!disabled}
    />
  )
}
