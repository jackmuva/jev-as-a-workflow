import { describe, expect, test } from "bun:test"
import {
  buildUnifiedDiff,
  filetypeFromPath,
  looksLikeLineNumberedOutput,
  parseLineNumberedContent,
} from "./utils"

describe("parseLineNumberedContent", () => {
  test("strips line number prefixes and preserves start line", () => {
    const input = "10: const x = 1\n11: const y = 2"
    expect(parseLineNumberedContent(input)).toEqual({
      content: "const x = 1\nconst y = 2",
      startLine: 10,
    })
  })
})

describe("looksLikeLineNumberedOutput", () => {
  test("detects read tool output", () => {
    expect(looksLikeLineNumberedOutput("1: hello\n2: world")).toBe(true)
    expect(looksLikeLineNumberedOutput("hello world")).toBe(false)
  })
})

describe("filetypeFromPath", () => {
  test("maps common extensions", () => {
    expect(filetypeFromPath("src/index.tsx")).toBe("tsx")
    expect(filetypeFromPath("script.sh")).toBe("bash")
  })
})

describe("buildUnifiedDiff", () => {
  test("builds a simple unified diff", () => {
    const diff = buildUnifiedDiff("src/a.ts", "old", "new")
    expect(diff).toContain("--- a/src/a.ts")
    expect(diff).toContain("-old")
    expect(diff).toContain("+new")
  })
})
