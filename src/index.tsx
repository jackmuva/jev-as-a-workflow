import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./ui/App"
import { frontLoadMessages } from "./services/agent/hooks/front-load"
import { mcpClient } from "./services/mcp/mcp-client"

let initialMessage: null | string = null
const seedMessages = await frontLoadMessages()

console.log("Connecting MCPs...")
try {
  await mcpClient.loadConfig()
  await mcpClient.connectAll()
} catch (e) {
  initialMessage = "Error with MCP process: " + e
}

process.on("exit", () => { void mcpClient.close() })
const renderer = await createCliRenderer()
createRoot(renderer).render(<App initialMessage={initialMessage} seedMessages={seedMessages} />)
