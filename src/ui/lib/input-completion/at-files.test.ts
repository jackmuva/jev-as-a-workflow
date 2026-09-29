import { describe, expect, test } from "bun:test"
import { filterFiles } from "./at-files"

const SAMPLE_FILES = [
  "package.json",
  "src/ui/App.tsx",
  "src/ui/lib/input-completion/at-files.ts",
  "README.md",
]

describe("filterFiles", () => {
  test("matches by substring", () => {
    expect(filterFiles(SAMPLE_FILES, "age.json")).toEqual(["package.json"])
  })

  test("matches by fuzzy sequence", () => {
    expect(filterFiles(SAMPLE_FILES, "pkg.json")).toEqual(["package.json"])
  })

  test("prefers prefix matches over substring matches", () => {
    const files = ["src/readme.md", "README.md"]
    expect(filterFiles(files, "read")).toEqual(["README.md"])
  })

})
