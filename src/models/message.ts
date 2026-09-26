export type Message = {
  role: "USER" | "SYSTEM" | "AGENT",
  type: "text" | "json" | "tool",
  content: string,
}
