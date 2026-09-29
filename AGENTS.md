# Jev Workflow Runner — Agent Guide

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
- **MCP integration** — configuration is loaded from the environment and all
  configured MCP servers are connected automatically at startup.
- **Front-loaded messages** — the conversation is seeded before the UI boots so
  content renders immediately.
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
├── index.tsx             # Entry point – initializes MCP clients & renders the TUI
├── constants.ts          # Shared constants
├── models/               # Data models / types
├── services/             # Business logic (agent hooks, MCP client)
│   ├── agent/
│   │   └── hooks/
│   │       └── front-load.ts   # Seeds initial conversation messages
│   └── mcp/
│       └── mcp-client.ts       # MCP config loading & connection management
└── ui/
    └── App.tsx           # Root React component for the TUI
```

---

## Architecture / How It Works

1. **Startup** – messages are front-loaded via `frontLoadMessages()` so the UI
   is populated immediately.
2. **MCP client** – `mcpClient.loadConfig()` reads configuration from the
   environment, then `connectAll()` connects to every configured server.
3. **Failure tolerance** – if MCP setup fails, a warning message is shown in the
   UI instead of crashing the process.
4. **Render** – the `@opentui/core` CLI renderer boots and `createRoot()` renders
   `<App />` with the seeded messages and any initial error.
5. **Shutdown** – an exit handler closes all MCP connections cleanly.

---

## Coding Conventions

- **TypeScript** throughout; run `bun run lint` (`tsc --noEmit`) before finishing.
- Prefer **explicit types** over `any` where feasible.
- Keep business logic in `src/services/`; keep UI components in `src/ui/`.
- Place shared values in `src/constants.ts`.
- Follow the existing naming/structure when adding new services or models.

---

## Agent Instructions

- **Read before editing** – understand `src/index.tsx` and `src/services/mcp/mcp-client.ts`
  before making changes to startup or connection logic.
- **Honor the failure-tolerant design** – do not introduce code that crashes on
  missing MCP config; surface warnings in the UI instead.
- **Preserve graceful shutdown** – any code touching MCP connections must respect
  the existing clean-close-on-exit path.
- **Verify with the toolchain** – after changes, run `bun run lint` and confirm
  the app still boots with `bun dev`.