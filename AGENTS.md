# JaaW — Agent Guide

This document tells AI coding agents (and other contributors) how to work in this
repository effectively. It sits alongside the project `README.md` (user-facing
docs) and complements any tool-specific guidance in `.cursor/` / `.claude/`.
An `AGENTS.md` file can also be discovered at runtime (see Architecture) to seed
workspace instructions into the conversation.

---

## Project Overview

A terminal-based (TUI) application built on **OpenTUI** that connects to MCP
(Model Context Protocol) servers and renders a conversational agent interface
that plans, executes tasks, and can be distilled into reusable workflows.

Key properties:

- **Stack** — TypeScript, [Bun](https://bun.sh/) (`>=1.3.0`), React 19, OpenTUI
  (`@opentui/core`, `@opentui/react`), `@modelcontextprotocol/sdk`, and the Vercel
  `ai` SDK.
- **TUI renderer** — OpenTUI provides the interactive terminal experience.
- **App config** — a `config.json` in `JEV_HOME` (`~/.jaaw`)
  drives the app. It exposes values such as `aiGatewayApiKey` and `llmModel`,
  which are loaded at startup and surfaced as environment variables.
- **Configurable LLM model** — the model used by the agent is read from the
  `LLM_MODEL` environment variable, which `loadAppConfig()` populates from the
  `llmModel` field in `config.json`. Falls back to `deepseek/deepseek-v4-flash`
  when unset.
- **System model** — `SYSTEM_ONE_MODEL` (default `typesafe-ai/jev`) drives
  planning/decision nodes in the agent graph.
- **MCP integration** — configuration is loaded from the environment and all
  configured MCP servers are connected automatically at startup, with OAuth
  support for connections that need it.
- **Front-loaded messages** — the conversation is seeded (workspace root
  instructions, enabled `AGENTS.md` content, and an enabled skills catalog)
  before the UI boots so content renders immediately.
- **Capability selection** — skills, MCP servers, `AGENTS.md` files, and user
  tools are discovered at startup and can be selectively enabled/toggled from
  the UI before running.
- **Session persistence** — conversations are persisted to a SQLite store
  (`DB_PATH` → `JEV_HOME/jaaw-sqlite.db`) and can be resumed via `/resume`.
- **Workflows** — sessions can be distilled into reusable workflows
  (`/generate-workflow` / `/run-workflow`) stored in the workflow store and run
  step-by-step with required capabilities.
- **Skill support** — skills are discovered from `./skills`, `JEV_HOME/skills`,
  and `~/.cursor/skills-cursor`; each has a frontmatter `name`/`description` and
  can be loaded at runtime via the `load_skill` tool.
- **User tools** — a `user` tool server namespace supports custom tools
  registered via `loadUserTools()` from `JEV_HOME/tools`.
- **Agent graph** — the runtime is a state machine (`START` → `PLAN` /
  `DISCOVERY` → `EXECUTE` → `END`, with `REWIND` support) orchestrated by
  `jevLoop()` and the graph nodes in `src/services/agent/graph.ts`.
- **Rewind** — the agent can rewind to a previous conversation checkpoint when
  it determines it took the wrong path.
- **AGENTS.md discovery** — `AGENTS.md` files are discovered alongside skills so
  workspace instructions can seed the conversation and be toggled as a capability.
- **Graceful shutdown** — MCP connections are closed cleanly on process exit.

---

## Commands

| Command                                  | Description                                                         |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `bun install`                            | Install dependencies (required first).                              |
| `bun dev`                                | Run the app in watch mode (`bun run --watch src/index.tsx`).        |
| `bun run lint`                           | Typecheck without emitting (`tsc --noEmit`).                        |
| `bun run build`                          | Compile a local executable (`bun build --compile --outfile jaaw`).  |
| `bun run install:opentui-platforms`      | Add all-platform/all-cpu `@opentui/core` (needed for cross-builds). |
| `bun run build:linux-x64`                | Cross-compile for Linux x64 (glibc) → `dist/jaaw-linux-x64`.        |
| `bun run build:linux-arm64`              | Cross-compile for Linux arm64 (glibc) → `dist/jaaw-linux-arm64`.    |
| `bun run build:linux-x64-musl`           | Cross-compile for Linux x64 (musl) → `dist/jaaw-linux-x64-musl`.    |
| `bun run build:linux-arm64-musl`         | Cross-compile for Linux arm64 (musl) → `dist/jaaw-linux-arm64-musl`.|
| `bun run build:darwin-x64`               | Cross-compile for macOS x64 → `dist/jaaw-darwin-x64`.               |
| `bun run build:darwin-arm64`             | Cross-compile for macOS arm64 → `dist/jaaw-darwin-arm64`.           |
| `bun run build:windows-x64`              | Cross-compile for Windows x64 → `dist/jaaw-windows-x64.exe`.        |
| `bun run build:all`                      | Install all OpenTUI platforms, then build for every target.         |

> Build artifacts land in `dist/`. Production is distributed as a compiled
> executable; the local build produces `./jaaw` and each cross-build writes to
> `dist/`. Local development uses `bun dev`.

---

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
│   │   ├── capabilities.test.ts
│   │   ├── graph.ts          # Agent graph runtime (START/PLAN/DISCOVERY/EXECUTE/END/REWIND)
│   │   ├── prompt.ts         # Prompt building
│   │   ├── default-tools/    # Built-in tools (apply-patch, bash, create-plan, edit-file,
│   │   │                     #   glob, grep, list-dir, load-skill, read-file, web-fetch,
│   │   │                     #   web-search, write-file, ask-question, …)
│   │   ├── hooks/            # Pre/roll-front hooks + tests + fixtures
│   │   │   ├── front-load.ts     # Seeds initial conversation; skill / AGENTS.md discovery
│   │   │   ├── compaction.ts     # Context compaction (uses LLM_MODEL)
│   │   │   ├── rewind.ts         # Rewind support
│   │   │   └── __fixtures__/     # Test fixtures
│   │   ├── user-tools/        # User tool discovery & loading
│   │   │   └── loader.ts      # listUserTools(), loadUserTools()
│   │   └── utils/             # jev-message, ask-question-state helpers
│   ├── config/                # App config loading from config.json
│   │   └── app-config.ts      # loadAppConfig(), ensureJevHome()
│   ├── mcp/
│   │   ├── mcp-client.ts      # MCP config loading & connection management
│   │   └── oauth-provider.ts  # OAuth support for MCP connections
│   ├── workflow/              # Workflow pipeline modules
│   │   ├── build-message.ts   # Build a model message from tool calls
│   │   ├── extract-tool-calls.ts # Extract tool calls from messages
│   │   └── generate.ts        # Generation logic (generateWorkflowFromSession)
│   └── session/               # Session management
└── ui/                        # TUI components
    ├── App.tsx           # Root React component for the TUI; wires agent loop, dialogs.
    ├── hooks/            # e.g. useSessionPersistence
    ├── lib/              # format / input-completion helpers
    └── components/       # input/, session/, workflow/, primitives/ subcomponents
```

---

## Architecture / How It Works

1. **Startup** – `ensureJevHome()` creates `JEV_HOME` and scaffolds default
   `config.json`, `mcp.json`, `mcp-auth/`, and `tools/` when missing, then
   `loadAppConfig()` reads `config.json` and populates env vars (e.g.
   `AI_GATEWAY_API_KEY`, `LLM_MODEL` for `llmModel`). Messages are front-loaded
   via `frontLoadMessages()` so the UI is populated immediately.
2. **Front-loading** – workspace-root instructions, enabled `AGENTS.md` content,
   and an enabled skills catalog (from `discoverSkills()`, and `AGENTS.md`
   discovery via `discoverAgentsMd()`) seed the conversation.
3. **MCP connect** – `mcpClient.loadConfig()` reads configuration from the
   environment, then `connectAll()` connects to every configured server (with
   optional OAuth support in `oauth-provider.ts`). If MCP setup fails, a warning
   message is shown in the UI instead of crashing the process.
4. **Tool loading** – `loadUserTools()` registers custom tools in the `user`
   tool-server namespace from `JEV_HOME/tools`.
5. **Capability discovery** – skills, MCP servers, user tools, and `AGENTS.md`
   files are discovered into a `CapabilityCatalog` and surfaced in the UI where
   they can be selectively enabled/toggled before running.
6. **Render** – the `@opentui/core` CLI renderer boots and `createRoot()` renders
   `<App />` with the seeded messages and any initial error.
7. **Agent runtime** – `jevLoop()` orchestrates the state machine (`START` →
   `PLAN` / `DISCOVERY` → `EXECUTE` → `END`, with `REWIND`), running the graph
   nodes and hooks (`compactionHook`, `rewindState`).
8. **Shutdown** – an exit handler closes all MCP connections cleanly.

---

## Coding Conventions

- **TypeScript** throughout; run `bun run lint` (`tsc --noEmit`) before finishing.
- Prefer **explicit types** over `any` where feasible.
- Use **one line `if` statements** where they fit on a single line.
- **Use existing files** when possible over creating new ones.
- Prefer **inline logic** over creating new helper methods.
- Keep agent/model type definitions in `src/models/` (e.g. `src/models/agent.ts`,
  `src/models/config.ts`) rather than re-declaring them in `src/services/`.
- Keep business logic in `src/services/`; keep UI components in `src/ui/`.
- Place shared values in `src/constants.ts`.
- Follow the existing naming/structure when adding new services or models.

---

## Agent Instructions

- **Read before editing** – understand `src/index.tsx`, `src/services/config/app-config.ts`,
  and `src/services/mcp/mcp-client.ts` before making changes to startup, config, or
  connection logic.
- **Config-driven env vars** – when adding a configurable value, mirror the existing
  pattern in `loadAppConfig()`: map a `config.json` field to a `process.env` variable and
  give it a sensible default in `src/constants.ts`.
- **Honor the failure-tolerant design** – do not introduce code that crashes on
  missing MCP config; surface warnings in the UI instead.
- **Capability types live in `src/models/agent.ts`** – import `CapabilityCatalog`,
  `CapabilityKind`, and `CapabilitySelection` from there (not from
  `src/services/agent/capabilities.ts`, which only holds runtime state/helpers).
- **Preserve graceful shutdown** – any code touching MCP connections must respect
  the existing clean-close-on-exit path.
- **Verify with the toolchain** – after changes, run `bun run lint` and confirm
  the app still boots with `bun dev`.
