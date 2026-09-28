import { describe, expect, test } from "bun:test"
import { detectTrigger } from "./detect-trigger"

describe("detectTrigger", () => {
  test("detects @ file trigger at start of input", () => {
    expect(detectTrigger("@src", 4)).toEqual({
      kind: "at",
      startOffset: 0,
      query: "src",
      endOffset: 4,
    })
  })

  test("detects / slash trigger after whitespace", () => {
    expect(detectTrigger("please /cl", 10)).toEqual({
      kind: "slash",
      startOffset: 7,
      query: "cl",
      endOffset: 10,
    })
  })

  test("ignores @ inside a word", () => {
    expect(detectTrigger("foo@bar", 7)).toBeNull()
  })

  test("detects partial query before cursor", () => {
    expect(detectTrigger("@src/ui", 3)).toEqual({
      kind: "at",
      startOffset: 0,
      query: "sr",
      endOffset: 3,
    })
  })
})
