import type { ModelMessage } from "ai";

export type ChoiceProbabilities = { [choice: string]: number };

export type JevMessageFrame = 'summary';

/** A ModelMessage plus UI-only metadata. Only `message` is ever sent to an LLM. */
export type JevMessage = {
  message: ModelMessage,
  probabilities?: ChoiceProbabilities,
  frame?: JevMessageFrame,
}

export type STATE = "START" | "DISCOVERY" | "PLAN" | "EXECUTE" | "REWIND" | "END";
export type AgentState = {
  state: STATE,
  messages: JevMessage[],
  selectedTool?: string,
  /** Action-select probabilities that led to `selectedTool`; attached to its tool-call message. */
  probabilities?: ChoiceProbabilities,
}

export type UserToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
};

export type CapabilityKind = 'skills' | 'mcpServers' | 'userTools' | 'agentsMd';

export type CapabilitySelection = Record<CapabilityKind, string[]>;

export type CapabilityCatalog = Record<CapabilityKind, Array<{ name: string, description?: string }>>;


