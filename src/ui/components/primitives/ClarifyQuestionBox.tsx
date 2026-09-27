import type { SelectOption } from "@opentui/core"
import { useState } from "react"
import type { AskQuestionInput, AskQuestionItem } from "../../../services/agent/default-tools/ask-question"
import {
  formatAskQuestionAnswers,
  getQuestionPrompt,
  isQuestionAnswerComplete,
  type QuestionAnswer,
} from "../../../services/agent/utils/ask-question-state"
import { AGENT_BORDER_COLOR } from "./ToolFrame"

const OTHER_OPTION_ID = "other"

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

type ClarifyQuestionBoxProps = {
  input: AskQuestionInput
  onSubmit: (answersText: string) => void
}

export const ClarifyQuestionBox = ({ input, onSubmit }: ClarifyQuestionBoxProps) => {
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
