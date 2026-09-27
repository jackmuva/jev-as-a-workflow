import type { ToolViewProps } from "../../lib/types"
import { asRecord, callTitle } from "../../lib/utils"
import { ListToolView } from "../primitives/ListToolView"

export const AskQuestionToolCallView = (props: ToolViewProps) => {
  const record = asRecord(props.input)
  const questions = record?.questions
  const prompts = Array.isArray(questions)
    ? questions
      .map((question) => {
        if (question && typeof question === "object" && "prompt" in question) {
          const prompt = (question as { prompt?: unknown }).prompt
          return typeof prompt === "string" ? prompt : undefined
        }
        return undefined
      })
      .filter((prompt): prompt is string => Boolean(prompt))
    : undefined

  return (
    <ListToolView
      {...props}
      toolName={callTitle(props.toolName)}
      items={prompts ?? ["Clarifying question"]}
      subtitle="awaiting answer"
      text=""
    />
  )
}
