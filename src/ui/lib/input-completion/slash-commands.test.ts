import { describe, expect, test } from "bun:test"
import {
  executeSlashCommand,
  findSlashCommand,
  getSlashCompletions,
} from "./slash-commands"

describe("slash commands", () => {
  test("lists clear and resume completions", () => {
    const items = getSlashCompletions("")
    expect(items.map((item) => item.label)).toEqual(["/clear", "/resume"])
  })

  test("filters completions by prefix", () => {
    const items = getSlashCompletions("re")
    expect(items.map((item) => item.label)).toEqual(["/resume"])
  })

  test("finds slash command from input", () => {
    expect(findSlashCommand("/clear")?.name).toBe("clear")
    expect(findSlashCommand("/resume please")?.name).toBe("resume")
    expect(findSlashCommand("hello")).toBeNull()
  })

  test("executes clear and resume handlers", () => {
    const calls: string[] = []
    const handlers = {
      clearInput: () => calls.push("clearInput"),
      clearSession: () => calls.push("clearSession"),
      resumeSession: () => calls.push("resumeSession"),
    }

    expect(executeSlashCommand("clear", handlers)).toBe(true)
    expect(calls).toEqual(["clearSession", "clearInput"])

    calls.length = 0
    expect(executeSlashCommand("resume", handlers)).toBe(true)
    expect(calls).toEqual(["resumeSession", "clearInput"])

    expect(executeSlashCommand("unknown", handlers)).toBe(false)
  })
})
