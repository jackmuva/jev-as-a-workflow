import { describe, expect, test } from "bun:test"
import type { AgentState } from "../../../models/agent"
import { rewindState } from "./rewind"

describe("rewindState", () => {
  test("pops exhausted checkpoints from the working copy", () => {
    const baseState: AgentState = { state: "REWIND", messages: [] }
    const checkpoints = [
      { state: { state: "EXECUTE" as const, messages: [], selectedTool: "default/a" }, options: [] as string[] },
      { state: { state: "EXECUTE" as const, messages: [], selectedTool: "default/b" }, options: ["default/c", "default/d"] },
    ]

    const result = rewindState(checkpoints, baseState)

    expect(result.state.selectedTool).toBe("default/d")
    expect(result.state.state).toBe("EXECUTE")
    expect(result.checkpoints).toHaveLength(2)
    expect(result.checkpoints.at(-1)?.options).toEqual(["default/d"])
  })
})
