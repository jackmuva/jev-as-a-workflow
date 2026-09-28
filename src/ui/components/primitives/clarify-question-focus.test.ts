import { describe, expect, test } from "bun:test"
import {
  buildQuestionFocusTargets,
  getNextQuestionFocusTarget,
  normalizeQuestionFocusTarget,
} from "./clarify-question-focus"

describe("buildQuestionFocusTargets", () => {
  test("includes submit only when all questions are complete", () => {
    const questionIds = ["q1", "q2"]
    const incomplete = buildQuestionFocusTargets(
      2,
      { q1: { optionId: "a" }, q2: { optionId: "other" } },
      questionIds,
      false,
    )
    const complete = buildQuestionFocusTargets(
      2,
      { q1: { optionId: "a" }, q2: { optionId: "other" } },
      questionIds,
      true,
    )

    expect(incomplete).toEqual([
      { kind: "select", questionIndex: 0 },
      { kind: "select", questionIndex: 1 },
      { kind: "other-input", questionIndex: 1 },
    ])
    expect(complete).toEqual([
      { kind: "select", questionIndex: 0 },
      { kind: "select", questionIndex: 1 },
      { kind: "other-input", questionIndex: 1 },
      { kind: "submit" },
    ])
  })
})

describe("getNextQuestionFocusTarget", () => {
  const targets = buildQuestionFocusTargets(
    2,
    { q1: { optionId: "a" }, q2: { optionId: "other" } },
    ["q1", "q2"],
    true,
  )

  test("tabs forward through questions, other input, and submit", () => {
    let current = targets[0]!
    current = getNextQuestionFocusTarget(targets, current)
    expect(current).toEqual({ kind: "select", questionIndex: 1 })
    current = getNextQuestionFocusTarget(targets, current)
    expect(current).toEqual({ kind: "other-input", questionIndex: 1 })
    current = getNextQuestionFocusTarget(targets, current)
    expect(current).toEqual({ kind: "submit" })
    current = getNextQuestionFocusTarget(targets, current)
    expect(current).toEqual({ kind: "select", questionIndex: 0 })
  })

  test("shift-tab moves backward", () => {
    expect(
      getNextQuestionFocusTarget(
        targets,
        { kind: "submit" },
        true,
      ),
    ).toEqual({ kind: "other-input", questionIndex: 1 })
  })
})

describe("normalizeQuestionFocusTarget", () => {
  test("falls back when other-input is no longer available", () => {
    const targets = buildQuestionFocusTargets(
      2,
      { q1: { optionId: "a" }, q2: { optionId: "b" } },
      ["q1", "q2"],
      false,
    )

    expect(
      normalizeQuestionFocusTarget(targets, { kind: "other-input", questionIndex: 1 }),
    ).toEqual({ kind: "select", questionIndex: 1 })
  })
})
