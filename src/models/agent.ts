import type { ModelMessage } from "ai";

export type STATE = "START" | "DISCOVERY" | "PLAN" | "EXECUTE" | "REWIND" | "END";
export type AgentState = {
  state: STATE,
  messages: ModelMessage[],
  selectedTool?: string,
}
