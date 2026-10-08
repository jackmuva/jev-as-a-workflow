import type { KeyEvent } from "@opentui/core"

const NON_TYPING_KEYS = new Set([
  "up",
  "down",
  "left",
  "right",
  "escape",
  "return",
  "kpenter",
  "linefeed",
  "space",
  "tab",
  "backspace",
  "delete",
  "home",
  "end",
  "pageup",
  "pagedown",
])

export type FilterKeyAction =
  | { type: "append", char: string }
  | { type: "backspace" }

export const getFilterKeyAction = (key: KeyEvent): FilterKeyAction | null => {
  if (key.ctrl || key.meta) return null
  if (key.name === "backspace") return { type: "backspace" }
  if (NON_TYPING_KEYS.has(key.name)) return null
  if (key.name.length === 1) return { type: "append", char: key.name.toLowerCase() }
  if (key.sequence.length === 1 && key.sequence.charCodeAt(0) >= 32) {
    return { type: "append", char: key.sequence.toLowerCase() }
  }
  return null
}
