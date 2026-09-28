# Jev Workflow Runner

Jev Workflow Runner is a terminal-based (TUI) application built on [OpenTUI](https://github.com/msmps/create-tui) that connects to MCP (Model Context Protocol) clients and renders a conversational agent interface.

## Features

- **OpenTUI renderer** – built with `@opentui/core` and `@opentui/react` for a fully interactive terminal experience.
- **MCP client integration** – loads configuration from your environment and connects to all configured MCP clients automatically at startup.
- **Front-loaded message seeding** – pre-loads conversation messages before the UI starts, ready for immediate display.
- **Graceful shutdown** – closes MCP connections cleanly on process exit.

## Requirements

- [Bun](https://bun.sh/) 1.3.0 or later
- MCP servers configured (if you want to use the MCP integration)

## Installation

```bash
bun install
```

## Usage

```bash
bun dev
```

## Typecheck

```bash
bun run typecheck
```

## Project Structure

```
src/
├── index.tsx         # Entry point – initializes MCP clients & renders the TUI
├── constants.ts      # Shared constants
├── models/           # Data models / types
├── services/         # Business logic (agent hooks, MCP client)
│   ├── agent/
│   │   └── hooks/
│   │       └── front-load.ts    # Seeds initial conversation messages
│   └── mcp/
│       └── mcp-client.ts        # MCP config loading & connection management
└── ui/
    └── App.tsx       # Root React component for the TUI
```

## How It Works

1. On startup, messages are front-loaded via `frontLoadMessages()`, so the interface is populated immediately.
2. The MCP client loads its configuration from `mcpClient.loadConfig()` and connects to all configured servers with `connectAll()`.
3. If MCP setup fails, a warning message is shown in the UI instead of crashing.
4. The `@opentui/core` CLI renderer boots and `createRoot()` renders the `<App />` component with the seeded messages and any initial error message.
5. When the process exits, a handler closes all MCP connections cleanly.

---

This project was created using `bun create tui`. [create-tui](https://github.com/msmps/create-tui) is the easiest way to get started with OpenTUI.
