import { describe, expect, test } from "bun:test"
import { fuzzyContains, fuzzyScore } from "./fuzzy-match"

describe("fuzzyContains", () => {
  test("matches exact substring", () => {
    expect(fuzzyContains("package.json", "package")).toBe(true)
    expect(fuzzyContains("package.json", "age.json")).toBe(true)
    expect(fuzzyContains("configure", "cng")).toBe(true)
  })

  test("matches case-insensitive", () => {
    expect(fuzzyContains("Package.JSON", "package.json")).toBe(true)
    expect(fuzzyContains("Configure", "CNG")).toBe(true)
  })

  test("fuzzy sequence matches", () => {
    expect(fuzzyContains("package.json", "pkg.json")).toBe(true)
    expect(fuzzyContains("configure", "cng")).toBe(true)
  })

  test("rejects non-matches", () => {
    expect(fuzzyContains("package.json", "xyz")).toBe(false)
    expect(fuzzyContains("configure", "configx")).toBe(false)
  })
})

describe("fuzzyScore", () => {
  test("prefix matches score 0", () => {
    expect(fuzzyScore("configure", "conf")).toBe(0)
  })

  test("substring matches score 1", () => {
    expect(fuzzyScore("package.json", "age.json")).toBe(1)
  })

  test("fuzzy matches score 2", () => {
    expect(fuzzyScore("configure", "cng")).toBe(2)
  })

  test("non-matches score 3", () => {
    expect(fuzzyScore("package.json", "zzz")).toBe(3)
  })
})
