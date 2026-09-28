const OTHER_OPTION_ID = "other"

export type QuestionFocusTarget =
  | { kind: "select"; questionIndex: number }
  | { kind: "other-input"; questionIndex: number }
  | { kind: "submit" }

export type QuestionAnswerLike = {
  optionId: string
}

export const isSameFocusTarget = (
  left: QuestionFocusTarget,
  right: QuestionFocusTarget,
): boolean =>
  left.kind === right.kind &&
  (left.kind === "submit" ||
    right.kind === "submit" ||
    left.questionIndex === right.questionIndex)

export const buildQuestionFocusTargets = (
  questionCount: number,
  answersByQuestionId: Record<string, QuestionAnswerLike>,
  questionIds: string[],
  allComplete: boolean,
): QuestionFocusTarget[] => {
  const targets: QuestionFocusTarget[] = []

  for (let index = 0; index < questionCount; index++) {
    targets.push({ kind: "select", questionIndex: index })
    const answer = answersByQuestionId[questionIds[index] ?? ""]
    if (answer?.optionId === OTHER_OPTION_ID) {
      targets.push({ kind: "other-input", questionIndex: index })
    }
  }

  if (allComplete) {
    targets.push({ kind: "submit" })
  }

  return targets
}

export const getNextQuestionFocusTarget = (
  targets: QuestionFocusTarget[],
  current: QuestionFocusTarget,
  reverse = false,
): QuestionFocusTarget => {
  if (targets.length === 0) {
    return current
  }

  const currentIndex = targets.findIndex((target) => isSameFocusTarget(target, current))
  const nextIndex =
    currentIndex === -1
      ? 0
      : reverse
        ? (currentIndex - 1 + targets.length) % targets.length
        : (currentIndex + 1) % targets.length

  return targets[nextIndex] ?? targets[0]!
}

export const normalizeQuestionFocusTarget = (
  targets: QuestionFocusTarget[],
  current: QuestionFocusTarget,
): QuestionFocusTarget => {
  if (targets.some((target) => isSameFocusTarget(target, current))) {
    return current
  }

  const fallbackIndex =
    current.kind === "submit" ? 0 : Math.min(current.questionIndex, targets.length - 1)

  return (
    targets.find(
      (target) =>
        target.kind !== "submit" &&
        target.questionIndex === fallbackIndex &&
        (current.kind !== "other-input" || target.kind === "other-input"),
    ) ??
    targets.find((target) => target.kind === "select" && target.questionIndex === fallbackIndex) ??
    targets[0] ??
    { kind: "select", questionIndex: 0 }
  )
}
