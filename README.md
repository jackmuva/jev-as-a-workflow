# JaaW

JaaW (Jev as a workflow) is a terminal-based (TUI) application built on [OpenTUI](https://github.com/msmps/create-tui) that connects to MCP (Model Context Protocol) clients and renders a conversational agent interface.

## Features

- **OpenTUI renderer** – built with `@opentui/core` and `@opentui/react` for a fully interactive terminal experience.
- **MCP client integration** – loads configuration from your environment and connects to all configured MCP clients automatically at startup.
- **Front-loaded message seeding** – pre-loads conversation messages before the UI starts, ready for immediate display.
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

Create your config directory and MCP config:

```bash
mkdir -p ~/.jaaw
# Add ~/.jaaw/mcp.json with your MCP server configuration
```

Optional local skills can be placed in `~/.jaaw/skills/`.

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
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
```

Replace `v0.1.1` with the version you are releasing. Tags are pushed to GitHub and picked up by the release workflow.

## Typecheck

```bash
bun run lint
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
