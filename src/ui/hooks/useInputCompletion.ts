import type { KeyEvent, TextareaRenderable } from "@opentui/core"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { detectTrigger } from "../lib/input-completion/detect-trigger"
import { getCompletions } from "../lib/input-completion/get-completions"
import { findSlashCommand } from "../lib/input-completion/providers/slash-commands"
import type { CompletionItem, CompletionState } from "../lib/input-completion/types"

const closedState = (): CompletionState => ({ open: false })

type UseInputCompletionOptions = {
  textareaRef: RefObject<TextareaRenderable | null>
  disabled?: boolean
}

export const useInputCompletion = ({ textareaRef, disabled = false }: UseInputCompletionOptions) => {
  const [completion, setCompletion] = useState<CompletionState>(closedState)
  const requestIdRef = useRef(0)

  const closeCompletion = useCallback(() => {
    setCompletion(closedState())
  }, [])

  const clearInput = useCallback(() => {
    textareaRef.current?.clear()
    closeCompletion()
  }, [closeCompletion, textareaRef])

  const runSlashCommand = useCallback((item: CompletionItem) => {
    const command = item.value as { handler?: (context: { clearInput: () => void }) => void }
    command.handler?.({ clearInput })
  }, [clearInput])

  const applyCompletion = useCallback((item: CompletionItem, trigger: CompletionState & { open: true }) => {
    const textarea = textareaRef.current
    if (!textarea) return

    if (trigger.trigger.kind === "slash") {
      runSlashCommand(item)
      if (item.id === "slash:clear") {
        return
      }
    }

    const before = textarea.plainText.slice(0, trigger.trigger.startOffset)
    const after = textarea.plainText.slice(trigger.trigger.endOffset)
    const nextText = `${before}${item.insertText}${after}`
    textarea.replaceText(nextText)
    textarea.cursorOffset = before.length + item.insertText.length
    closeCompletion()
  }, [closeCompletion, runSlashCommand, textareaRef])

  const acceptSelected = useCallback(() => {
    if (!completion.open || completion.items.length === 0) return false

    const item = completion.items[completion.selectedIndex]
    if (!item) return false

    applyCompletion(item, completion)
    return true
  }, [applyCompletion, completion])

  const syncCompletion = useCallback(async () => {
    if (disabled) {
      closeCompletion()
      return
    }

    const textarea = textareaRef.current
    if (!textarea) return

    const trigger = detectTrigger(textarea.plainText, textarea.cursorOffset)
    if (!trigger) {
      closeCompletion()
      return
    }

    const requestId = ++requestIdRef.current
    const items = await getCompletions(trigger)
    if (requestId !== requestIdRef.current) return

    if (items.length === 0) {
      closeCompletion()
      return
    }

    setCompletion((previous) => {
      const selectedIndex = previous.open
        && previous.trigger.startOffset === trigger.startOffset
        && previous.trigger.query === trigger.query
        ? Math.min(previous.selectedIndex, items.length - 1)
        : 0

      return {
        open: true,
        trigger,
        items,
        selectedIndex,
      }
    })
  }, [closeCompletion, disabled, textareaRef])

  const moveSelection = useCallback((delta: number) => {
    setCompletion((previous) => {
      if (!previous.open || previous.items.length === 0) return previous

      const nextIndex = (previous.selectedIndex + delta + previous.items.length) % previous.items.length
      return { ...previous, selectedIndex: nextIndex }
    })
  }, [])

  const handleKeyDown = useCallback((event: KeyEvent) => {
    if (!completion.open) return

    if (event.name === "up") {
      event.preventDefault()
      moveSelection(-1)
      return
    }

    if (event.name === "down") {
      event.preventDefault()
      moveSelection(1)
      return
    }

    if (event.name === "tab" || event.name === "return" || event.name === "kpenter") {
      event.preventDefault()
      acceptSelected()
      return
    }

    if (event.name === "escape") {
      event.preventDefault()
      closeCompletion()
    }
  }, [acceptSelected, closeCompletion, completion.open, moveSelection])

  const handleSubmitAttempt = useCallback((): boolean => {
    const textarea = textareaRef.current
    if (!textarea) return false

    if (completion.open) {
      acceptSelected()
      return false
    }

    const slashCommand = findSlashCommand(textarea.plainText)
    if (slashCommand?.handler) {
      slashCommand.handler({ clearInput })
      return false
    }

    return true
  }, [acceptSelected, clearInput, completion.open, textareaRef])

  useEffect(() => {
    if (disabled) closeCompletion()
  }, [closeCompletion, disabled])

  return {
    completion,
    syncCompletion,
    handleKeyDown,
    handleSubmitAttempt,
    acceptSelected,
    closeCompletion,
    clearInput,
  }
}
