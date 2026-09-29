# JaaW — Agent Guide

This document tells AI coding agents (and other contributors) how to work in this
repository effectively. It sits alongside the project `README.md` (user-facing
docs) and complements any tool-specific guidance in `.cursor/` / `.claude/`.

---

## Project Overview

A terminal-based (TUI) application built on **OpenTUI** that connects to MCP
(Model Context Protocol) servers and renders a conversational agent interface.

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
- **MCP integration** — configuration is loaded from the environment and all
  configured MCP servers are connected automatically at startup.
- **Front-loaded messages** — the conversation is seeded before the UI boots so
  content renders immediately.
- **Capability selection** — skills, MCP servers, and user tools are discovered
  at startup and can be selectively enabled/toggled from the UI before running.
- **Graceful shutdown** — MCP connections are closed cleanly on process exit.

---

## Commands

| Command               | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `bun install`         | Install dependencies (required first).                |
| `bun dev`             | Run the app in watch mode (`bun run --watch src/index.tsx`). |
| `bun run lint`        | Typecheck without emitting (`tsc --noEmit`).          |

> There is no production build script. The project is run during development
> via `bun dev`.

---

## Project Structure

```
src/
├── index.tsx             # Entry point – loads config, initializes MCP & renders the TUI
├── constants.ts          # Shared constants (incl. LLM_MODEL, JEV_HOME)
├── models/               # Data models / types
│   ├── agent.ts          # Agent model types (CapabilityCatalog, CapabilityKind, …)
│   ├── config.ts         # AppConfig (aiGatewayApiKey, llmModel)
│   └── mcp.ts            # MCP types
├── services/             # Business logic
│   ├── agent/            # Agent loop, graph, capabilities, prompts, tools & hooks
│   │   ├── capabilities.ts    # Capability selection state & helpers
│   │   ├── graph.ts           # Agent graph runtime (uses LLM_MODEL)
│   │   ├── hooks/
│   │   │   ├── front-load.ts  # Seeds initial conversation messages
│   │   │   └── compaction.ts  # Context compaction (uses LLM_MODEL)
│   │   ├── user-tools/        # User tool discovery & loading
│   │   └── utils/
│   ├── config/           # App config loading from config.json
│   │   └── app-config.ts      # loadAppConfig(), ensureJevHome()
│   ├── mcp/
│   │   └── mcp-client.ts      # MCP config loading & connection management
│   └── session/          # Session management
└── ui/                   # TUI components (App.tsx, dialogs, primitives, tool renderers)
    ├── App.tsx           # Root React component for the TUI
    └── components/
        └── session/      # e.g. CapabilitySelectionDialog
```

---

## Architecture / How It Works

1. **Startup** – messages are front-loaded via `frontLoadMessages()` so the UI
   is populated immediately.
2. **Config load** – `ensureJevHome()` creates `JEV_HOME`, then
   `loadAppConfig()` reads `config.json` and populates env vars (e.g.
   `AI_GATEWAY_API_KEY`, `LLM_MODEL` for `llmModel`).
3. **Capability discovery** – skills, MCP servers, and user tools are discovered
   (`discoverSkills()`, `loadUserTools()`) and surfaced in the UI where they can
   be selectively enabled.
4. **MCP client** – `mcpClient.loadConfig()` reads configuration from the
   environment, then `connectAll()` connects to every configured server.
5. **Failure tolerance** – if MCP setup fails, a warning message is shown in the
   UI instead of crashing the process.
6. **Render** – the `@opentui/core` CLI renderer boots and `createRoot()` renders
   `<App />` with the seeded messages and any initial error.
7. **Shutdown** – an exit handler closes all MCP connections cleanly.

---

## Coding Conventions

- **TypeScript** throughout; run `bun run lint` (`tsc --noEmit`) before finishing.
- Prefer **explicit types** over `any` where feasible.
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