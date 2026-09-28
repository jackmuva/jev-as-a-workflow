import type { KeyBinding, TextareaRenderable } from "@opentui/core"
import { useEffect, useRef } from "react"
import { listWorkspaceFiles } from "../../lib/input-completion/file-index"
import { useInputCompletion } from "../../hooks/useInputCompletion"
import { InputCompletionMenu } from "./InputCompletionMenu"

const chatKeyBindings: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "kpenter", action: "submit" },
  { name: "kpenter", shift: true, action: "newline" },
  { name: "linefeed", action: "submit" },
  { name: "linefeed", shift: true, action: "newline" },
]

type ChatInputProps = {
  disabled?: boolean
  placeholder?: string
  marginY?: number
  onSubmit: (text: string) => void | Promise<void>
}

export const ChatInput = ({
  disabled = false,
  placeholder = "What would you like to do",
  marginY = 0,
  onSubmit,
}: ChatInputProps) => {
  const textareaRef = useRef<TextareaRenderable>(null)
  const {
    completion,
    syncCompletion,
    handleKeyDown,
    handleSubmitAttempt,
  } = useInputCompletion({ textareaRef, disabled })

  useEffect(() => {
    void listWorkspaceFiles()
  }, [])

  const handleSubmit = async () => {
    if (disabled) return
    if (!handleSubmitAttempt()) return

    const text = textareaRef.current?.plainText.trim()
    if (!text) return

    textareaRef.current?.clear()
    await onSubmit(text)
  }

  return (
    <box flexDirection="column" width="100%">
      {completion.open && (
        <InputCompletionMenu
          items={completion.items}
          selectedIndex={completion.selectedIndex}
        />
      )}
      <textarea
        ref={textareaRef}
        marginY={marginY}
        placeholder={placeholder}
        keyBindings={chatKeyBindings}
        onSubmit={handleSubmit}
        onContentChange={syncCompletion}
        onCursorChange={syncCompletion}
        onKeyDown={handleKeyDown}
        focused={!disabled}
      />
    </box>
  )
}
