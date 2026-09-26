import type { ModelMessage } from "ai";

export type STATE = "START" | "DISCOVERY" | "PLAN" | "EXECUTE" | "END";
export type AgentState = { state: STATE, messages: ModelMessage[] }
