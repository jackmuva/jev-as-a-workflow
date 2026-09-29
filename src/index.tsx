import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./ui/App"
import type { CapabilityCatalog } from "./services/agent/capabilities"
import { discoverSkills, frontLoadMessages } from "./services/agent/hooks/front-load"
import { jevMessage } from "./services/agent/utils/jev-message"
import { listUserTools, loadUserTools } from "./services/agent/user-tools/loader"
import { mcpClient } from "./services/mcp/mcp-client"

let initialMessage: null | string = null
const seedMessages = (await frontLoadMessages()).map((message) => jevMessage(message))

console.log("Connecting MCPs...")
try {
  await mcpClient.loadConfig()
  await mcpClient.connectAll()
} catch (e) {
  initialMessage = "Error with MCP process: " + e
}

await loadUserTools()
const capabilityCatalog: CapabilityCatalog = {
  skills: await discoverSkills(),
  mcpServers: mcpClient.listServers().map((name) => ({ name })),
  userTools: listUserTools(),
}

process.on("exit", () => { void mcpClient.close() })
const renderer = await createCliRenderer()
createRoot(renderer).render((
  <App
    initialMessage={initialMessage}
    seedMessages={seedMessages}
    capabilityCatalog={capabilityCatalog}
  />
))
