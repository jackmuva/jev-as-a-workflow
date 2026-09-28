import { describe, expect, test } from "bun:test"
import { extractFileReferences, resolveUserMessage } from "./resolve-message"

describe("extractFileReferences", () => {
  test("finds file references in text", () => {
    expect(extractFileReferences("review @src/ui/App.tsx please")).toEqual(["src/ui/App.tsx"])
  })
})

describe("resolveUserMessage", () => {
  test("passes through plain text", async () => {
    await expect(resolveUserMessage("hello")).resolves.toEqual({
      role: "user",
      content: "hello",
    })
  })

  test("attaches referenced file content", async () => {
    const message = await resolveUserMessage("explain @README.md")
    expect(message.role).toBe("user")
    expect(typeof message.content).toBe("string")
    expect(message.content).toContain("explain @README.md")
    expect(message.content).toContain("[Attached: README.md]")
    expect(message.content).toContain("Jev Workflow Runner")
  })
})
