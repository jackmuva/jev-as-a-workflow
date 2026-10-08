import { describe, expect, test } from "bun:test"
import type { KeyEvent } from "@opentui/core"
import { getFilterKeyAction } from "./dialog-filter-key"

const key = (partial: Partial<KeyEvent> & Pick<KeyEvent, "name">): KeyEvent =>
  ({
    ctrl: false,
    meta: false,
    shift: false,
    option: false,
    sequence: partial.name.length === 1 ? partial.name : "",
    number: false,
    raw: "",
    eventType: "press",
    source: "raw",
    ...partial,
  }) as KeyEvent

describe("getFilterKeyAction", () => {
  test("maps printable keys to append actions", () => {
    expect(getFilterKeyAction(key({ name: "g" }))).toEqual({ type: "append", char: "g" })
  })

  test("maps backspace to backspace action", () => {
    expect(getFilterKeyAction(key({ name: "backspace" }))).toEqual({ type: "backspace" })
  })

  test("ignores navigation and modifier keys", () => {
    expect(getFilterKeyAction(key({ name: "up" }))).toBeNull()
    expect(getFilterKeyAction(key({ name: "a", ctrl: true }))).toBeNull()
    expect(getFilterKeyAction(key({ name: "space" }))).toBeNull()
  })
})
