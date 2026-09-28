import type { SelectOption } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useEffect, useMemo, useState } from "react"
import type { AskQuestionInput, AskQuestionItem } from "../../../services/agent/default-tools/ask-question"
import {
  formatAskQuestionAnswers,
  getQuestionPrompt,
  isQuestionAnswerComplete,
  type QuestionAnswer,
} from "../../../services/agent/utils/ask-question-state"
import { AGENT_BORDER_COLOR } from "./ToolFrame"

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

type QuestionFieldProps = {
  question: AskQuestionItem
  answer: QuestionAnswer
  onAnswerChange: (answer: QuestionAnswer) => void
  onOtherSelected: () => void
  selectFocused: boolean
  inputFocused: boolean
}

const QuestionField = ({
  question,
  answer,
  onAnswerChange,
  onOtherSelected,
  selectFocused,
  inputFocused,
}: QuestionFieldProps) => {
  const options: SelectOption[] = question.options.map((option) => ({
    name: option.label,
    description: "",
    value: option.id,
  }))
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === answer.optionId),
  )
  const isOther = answer.optionId === OTHER_OPTION_ID

  return (
    <box flexDirection="column" marginBottom={1} width="100%">
      <text fg={AGENT_BORDER_COLOR}>{getQuestionPrompt(question)}</text>
      <select
        options={options}
        selectedIndex={selectedIndex}
        showDescription={false}
        height={Math.max(1, options.length)}
        width="100%"
        focused={selectFocused}
        onChange={(_, option) => {
          if (!option?.value) return
          onAnswerChange({
            optionId: String(option.value),
            customText: String(option.value) === OTHER_OPTION_ID ? answer.customText : "",
          })
        }}
        onSelect={(_, option) => {
          if (String(option?.value) === OTHER_OPTION_ID) {
            onOtherSelected()
          }
        }}
      />
      {isOther && (
        <input
          placeholder="Type your answer..."
          value={answer.customText}
          width="100%"
          focused={inputFocused}
          onInput={(value) =>
            onAnswerChange({ ...answer, customText: value })
          }
        />
      )}
    </box>
  )
}

type ClarifyQuestionBoxProps = {
  input: AskQuestionInput
  onSubmit: (answersText: string) => void
}

export const ClarifyQuestionBox = ({ input, onSubmit }: ClarifyQuestionBoxProps) => {
  const questions = input.questions
  const questionIds = useMemo(() => questions.map((question) => question.id), [questions])
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(() =>
    Object.fromEntries(
      questions.map((question) => [
        question.id,
        {
          optionId: question.options[0]?.id ?? OTHER_OPTION_ID,
          customText: "",
        },
      ]),
    ),
  )
  const [focusTarget, setFocusTarget] = useState<QuestionFocusTarget>({
    kind: "select",
    questionIndex: 0,
  })
  const allComplete = questions.every((question) =>
    isQuestionAnswerComplete(question, answers[question.id]),
  )
  const focusTargets = useMemo(
    () => buildQuestionFocusTargets(questionIds.length, answers, questionIds, allComplete),
    [allComplete, answers, questionIds],
  )

  useEffect(() => {
    setFocusTarget((current) => normalizeQuestionFocusTarget(focusTargets, current))
  }, [focusTargets])

  useKeyboard((key) => {
    if (key.name !== "tab") return
    setFocusTarget((current) =>
      getNextQuestionFocusTarget(focusTargets, current, key.shift),
    )
  })

  const handleSubmit = () => {
    if (!allComplete) return
    onSubmit(formatAskQuestionAnswers(questions, answers))
  }

  return (
    <box
      border={true}
      borderColor={AGENT_BORDER_COLOR}
      paddingLeft={1}
      marginY={1}
      width="100%"
      flexDirection="column"
    >
      {input.title && <text fg={AGENT_BORDER_COLOR}>{input.title}</text>}
      {questions.map((question, index) => (
        <QuestionField
          key={question.id}
          question={question}
          answer={
            answers[question.id] ?? {
              optionId: question.options[0]?.id ?? OTHER_OPTION_ID,
              customText: "",
            }
          }
          selectFocused={
            focusTarget.kind === "select" && focusTarget.questionIndex === index
          }
          inputFocused={
            focusTarget.kind === "other-input" && focusTarget.questionIndex === index
          }
          onOtherSelected={() =>
            setFocusTarget({ kind: "other-input", questionIndex: index })
          }
          onAnswerChange={(answer) =>
            setAnswers((prev) => ({ ...prev, [question.id]: answer }))
          }
        />
      ))}
      <text fg={AGENT_BORDER_COLOR}>
        {allComplete
          ? "Tab between questions and submit · ↑↓ choose · Enter to select · Enter on submit to send"
          : "Tab between questions · ↑↓ choose · Enter to select · choose Other to type a custom answer"}
      </text>
      <input
        placeholder={allComplete ? "Press Enter to submit" : "Complete all questions first"}
        width="100%"
        focused={focusTarget.kind === "submit"}
        onSubmit={handleSubmit}
      />
    </box>
  )
}
