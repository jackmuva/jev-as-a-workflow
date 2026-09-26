import type { SelectOption } from "@opentui/core"
import type { ModelMessage } from "ai"
import { useState } from "react"
import type { AskQuestionInput, AskQuestionItem } from "../services/agent/default-tools/ask-question"
import {
  formatAskQuestionAnswers,
  getQuestionPrompt,
  isQuestionAnswerComplete,
  type QuestionAnswer,
} from "../services/agent/utils/ask-question-state"

export const AGENT_BORDER_COLOR = "#565f89"

const TOOL_RESULT_PREVIEW_LINES = 11
const OTHER_OPTION_ID = "other"

type ToolResultPart = Extract<
  NonNullable<ModelMessage["content"]>[number],
  { type: "tool-result" }
>

type ToolCallPart = Extract<
  NonNullable<ModelMessage["content"]>[number],
  { type: "tool-call" }
>

type QuestionFieldProps = {
  question: AskQuestionItem
  answer: QuestionAnswer
  onAnswerChange: (answer: QuestionAnswer) => void
  selectFocused: boolean
  inputFocused: boolean
}

const QuestionField = ({
  question,
  answer,
  onAnswerChange,
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

export const ClarifyQuestionBox = ({
  input,
  onSubmit,
}: {
  input: AskQuestionInput
  onSubmit: (answersText: string) => void
}) => {
  const questions = input.questions
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
  const allComplete = questions.every((question) =>
    isQuestionAnswerComplete(question, answers[question.id]),
  )
  const firstQuestion = questions[0]
  const firstAnswer = firstQuestion ? answers[firstQuestion.id] : undefined
  const firstIsOther = firstAnswer?.optionId === OTHER_OPTION_ID
  const focusFirstInput =
    !allComplete &&
    firstIsOther &&
    firstAnswer.customText.trim().length === 0

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
          selectFocused={!allComplete && index === 0 && !focusFirstInput}
          inputFocused={focusFirstInput && index === 0}
          onAnswerChange={(answer) =>
            setAnswers((prev) => ({ ...prev, [question.id]: answer }))
          }
        />
      ))}
      <text fg={AGENT_BORDER_COLOR}>
        {allComplete
          ? "Press Enter below to submit your answers"
          : "Select an option for each question (choose Other to type a custom answer)"}
      </text>
      <input
        placeholder={allComplete ? "Press Enter to submit" : "Complete all questions first"}
        width="100%"
        focused={allComplete}
        onSubmit={handleSubmit}
      />
    </box>
  )
}

export const formatToolResultText = (part: ToolResultPart): string => {
  if ("value" in part.output) {
    const value = part.output.value
    if (typeof value === "string") return value
    return JSON.stringify(value, null, 2)
  }
  return `[${part.output.type}]`
}

export const ToolResultBox = ({ part }: { part: ToolResultPart }) => {
  const [expanded, setExpanded] = useState(false)
  const text = formatToolResultText(part)
  const lines = text.split("\n")
  const lineCount = Math.max(1, lines.length)
  const isExpandable = lineCount > TOOL_RESULT_PREVIEW_LINES
  const hiddenLineCount = lineCount - TOOL_RESULT_PREVIEW_LINES
  const displayText =
    isExpandable && !expanded
      ? lines.slice(0, TOOL_RESULT_PREVIEW_LINES).join("\n")
      : text
  const instruction = isExpandable
    ? expanded
      ? "Click to collapse"
      : `Click to expand (${hiddenLineCount} more line${hiddenLineCount === 1 ? "" : "s"})`
    : null

  return (
    <box
      border={true}
      borderColor={AGENT_BORDER_COLOR}
      paddingLeft={1}
      marginBottom={1}
      width="75%"
      onMouseDown={
        isExpandable
          ? () => setExpanded((value) => !value)
          : undefined
      }
    >
      <text fg={AGENT_BORDER_COLOR}>{part.toolName}</text>
      <text>{displayText}</text>
      {instruction && <text fg={AGENT_BORDER_COLOR}>{instruction}</text>}
    </box>
  )
}

export const isAskQuestionToolCall = (part: ToolCallPart) =>
  part.toolName === "AskQuestion"
