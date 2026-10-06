# JaaW

JaaW (Jev as a workflow) is a terminal-based (TUI) application built on [OpenTUI](https://github.com/msmps/create-tui) that connects to MCP (Model Context Protocol) servers and renders a conversational agent interface that plans, executes tasks, and can be distilled into reusable workflows.

## Features

- **OpenTUI renderer** – built with `@opentui/core` and `@opentui/react` for a fully interactive terminal experience.
- **Configurable LLM model** – set your preferred model via `llmModel` in `~/.jaaw/config.json` (falls back to `deepseek/deepseek-v4-flash` via `LLM_MODEL`).
- **System model** – `SYSTEM_ONE_MODEL` (default `typesafe-ai/jev`) drives planning/decision nodes in the agent graph.
- **MCP server integration** – loads configuration from your environment and connects to all configured MCP servers automatically at startup, with OAuth support where needed.
- **Front-loaded message seeding** – pre-loads conversation messages (workspace instructions, enabled `AGENTS.md`, skills catalog) before the UI starts, ready for immediate display.
- **Capability selection** – skills, MCP servers, `AGENTS.md` files, and user tools are discovered at startup and can be selectively enabled/toggled from the UI.
- **Session persistence** – conversations persist to a SQLite store (`~/.jaaw/jaaw-sqlite.db`) and can be resumed via `/resume`.
- **Workflows** – sessions can be distilled into reusable workflows (`/generate-workflow` / `/run-workflow`) stored in the workflow store.
- **Skill support** – local skills discovered from `./skills`, `~/.jaaw/skills`, and `~/.cursor/skills-cursor`, loaded via the `load_skill` tool.
- **User tools** – custom tools from `~/.jaaw/tools` registered in a `user` tool-server namespace.
- **Agent graph** – a state machine (`START` → `PLAN` / `DISCOVERY` → `EXECUTE` → `END`, with `REWIND`) orchestrates the runtime.
- **Rewind** – the agent can rewind to a previous conversation checkpoint when it takes the wrong path.
- **Graceful shutdown** – closes MCP connections cleanly on process exit.

## Requirements

- MCP servers configured (if you want to use the MCP integration)
- For development from source: [Bun](https://bun.sh/) 1.3.0 or later

## Installation

Install the latest release with curl (Linux and macOS):

```bash
curl -fsSL https://raw.githubusercontent.com/jackmuva/jev-as-a-workflow/main/install.sh | sh
```

Install a specific version:

```bash
JEV_VERSION=v0.1.0 curl -fsSL https://raw.githubusercontent.com/jackmuva/jev-as-a-workflow/main/install.sh | sh
```

On Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/jackmuva/jev-as-a-workflow/main/install.ps1 | iex
```

The installer downloads a standalone binary and installs it as `jaaw` (by default to `~/.local/bin` on Unix). No Bun runtime is required on the target machine.

### First-run setup

On first launch, JaaW creates `~/.jaaw/` with default `config.json`, `mcp.json`,
`mcp-auth/`, and `tools/` directories. Edit `~/.jaaw/config.json` to set your
`aiGatewayApiKey` and preferred `llmModel`, and add MCP servers to
`~/.jaaw/mcp.json`.

Optional local skills can be placed in `~/.jaaw/skills/`.

You can also place `AGENTS.md` files alongside your skills — these are discovered
at startup, can seed the conversation with workspace instructions, and can be
toggled on/off as a capability from the UI.

## Usage

Run the installed binary:

```bash
jaaw
```

## Development

Install dependencies and run in watch mode:

```bash
bun install
bun dev
```

Build a local standalone binary:

```bash
bun run build
./jaaw
```

Build release binaries for all supported platforms:

```bash
bun run build:all
```

## Releasing

Create and push a new version tag:

```bash
git tag -a v0.1.1 -m "v0.1.2"
git push origin v0.1.2
```

Replace `v0.1.1` with the version you are releasing. Tags are pushed to GitHub and picked up by the release workflow.

## Typecheck

```bash
bun run lint
```

## Project Structure

```
src/
├── index.tsx             # Entry point – loads config, initializes MCP, loads tools, renders the TUI
├── constants.ts          # Shared constants (JEV_HOME, LLM_MODEL, SYSTEM_ONE_MODEL, DB_PATH, …)
├── db/                   # Persistence
│   ├── session-store.ts      # Session persistence (chat history resume via /resume)
│   ├── session-store.test.ts
│   ├── workflow-store.ts     # Workflow persistence
│   └── workflow-store.test.ts
├── models/               # Data models / types
│   ├── agent.ts          # Agent model types (AgentState, CapabilityKind, JevMessage, …)
│   ├── config.ts         # AppConfig (aiGatewayApiKey, llmModel)
│   ├── mcp.ts            # MCP types
│   ├── ui.ts             # UI-related types
│   └── workflow.ts       # Workflow types
├── services/             # Business logic
│   ├── agent/            # Agent loop, graph, capabilities, prompts, skills & tools
│   │   ├── agent-loop.ts     # Agent loop orchestration (jevLoop)
│   │   ├── capabilities.ts   # Capability selection state & helpers
│   │   ├── graph.ts          # Agent graph runtime (START/PLAN/DISCOVERY/EXECUTE/END/REWIND)
│   │   ├── prompt.ts         # Prompt building
│   │   ├── default-tools/    # Built-in tools (apply-patch, bash, create-plan, read-file, …)
│   │   ├── hooks/            # front-load / compaction / rewind hooks + tests + fixtures
│   │   ├── user-tools/       # User tool discovery & loading (loader.ts)
│   │   └── utils/            # jev-message, ask-question-state helpers
│   ├── config/           # App config loading (loadAppConfig(), ensureJevHome())
│   ├── mcp/              # mcp-client.ts & oauth-provider.ts
│   ├── workflow/         # build-message, extract-tool-calls, generate
│   └── session/          # Session management
└── ui/                   # TUI components
    ├── App.tsx           # Root React component for the TUI; wires agent loop, dialogs
    ├── hooks/            # e.g. useSessionPersistence
    ├── lib/              # format / input-completion helpers
    └── components/       # input/, session/, workflow/, primitives/ subcomponents
```

## How It Works

1. **Startup** – `ensureJevHome()` creates `~/.jaaw/` and scaffolds default
   `config.json`, `mcp.json`, `mcp-auth/`, and `tools/` when missing, then
   `loadAppConfig()` reads `config.json` and populates env vars (e.g.
   `AI_GATEWAY_API_KEY`, `LLM_MODEL`).
2. **Front-loading** – workspace-root instructions, enabled `AGENTS.md` content,
   and an enabled skills catalog (from `discoverSkills()` and
   `discoverAgentsMd()`) seed the conversation.
3. **MCP connect** – `mcpClient.loadConfig()` reads configuration from the
   environment, then `connectAll()` connects to every configured server (with
   optional OAuth support). If MCP setup fails, a warning message is shown in the
   UI instead of crashing.
4. **Tool loading** – `loadUserTools()` registers custom tools in the `user`
   tool-server namespace from `~/.jaaw/tools`.
5. **Capability discovery** – skills, MCP servers, user tools, and `AGENTS.md`
   files are discovered into a `CapabilityCatalog` and surfaced in the UI where
   they can be selectively enabled/toggled.
6. **Render** – the `@opentui/core` CLI renderer boots and `createRoot()` renders
   `<App />` with the seeded messages and any initial error.
7. **Agent runtime** – `jevLoop()` orchestrates the state machine (`START` →
   `PLAN` / `DISCOVERY` → `EXECUTE` → `END`, with `REWIND`), running the graph
   nodes and hooks (`compactionHook`, `rewindState`).
8. **Shutdown** – an exit handler closes all MCP connections cleanly.

---

This project was created using `bun create tui`. [create-tui](https://github.com/msmps/create-tui) is the easiest way to get started with OpenTUI.
