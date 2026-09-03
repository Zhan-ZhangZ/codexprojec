# Claude Skill: Account Verification for AI Agents

> VirtualSMS is an account verification platform for developers and AI agents. It combines one-time SMS verification, dedicated number rentals, matching-country proxies and private cloud browser sessions behind one API, one MCP server and one prepaid balance.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![npm version](https://img.shields.io/npm/v/virtualsms-mcp.svg)](https://www.npmjs.com/package/virtualsms-mcp)
[![Powered by VirtualSMS MCP Server](https://img.shields.io/badge/Powered%20by-VirtualSMS%20MCP-7c3aed)](https://github.com/virtualsms-io/mcp-server)

## What this is

A Claude Skill that lets Claude Desktop and Claude Code drive the full
VirtualSMS account verification platform: receive one-time SMS codes,
rent dedicated numbers, buy matching-country proxies, and launch private
cloud browser sessions, all from one prepaid balance across **2500+
services** and **145+ countries** (growing weekly). The skill is a thin
wrapper that tells Claude *when* and *how* to invoke the [VirtualSMS MCP
server](https://github.com/virtualsms-io/mcp-server), the same
`virtualsms-mcp` npm package that powers Cursor, Windsurf, OpenClaw,
Codex, Hermes, Cline, Zed, and Continue.dev.

## Capabilities

- Receive one-time SMS codes from $0.05
- Rent dedicated numbers from 1 to 30 days
- Buy matching-country residential, mobile and datacenter proxies
- Launch private cloud browser sessions that work alongside your number and proxy (beta)

## Quick install: Hosted (recommended, zero install)

Paste this into your AI assistant's MCP config:

```json
{
  "mcpServers": {
    "virtualsms": {
      "type": "streamableHttp",
      "url": "https://mcp.virtualsms.io/mcp",
      "headers": { "x-api-key": "vsms_your_api_key_here" }
    }
  }
}
```

No `npm install`, no Node.js required on the client. The MCP server runs at [mcp.virtualsms.io](https://mcp.virtualsms.io).

Get your API key at <https://virtualsms.io>.

## Quick install: Local (stdio via npm)

1. Install the MCP server in Claude Desktop / Claude Code:

   ```bash
   npx virtualsms-mcp
   ```

2. Add to your Claude config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

   ```json
   {
     "mcpServers": {
       "virtualsms": {
         "command": "npx",
         "args": ["virtualsms-mcp"],
         "env": { "VIRTUALSMS_API_KEY": "vsms_your_key_here" }
       }
     }
   }
   ```

3. Drop [`SKILL.md`](./SKILL.md) into your Claude Skills directory (or
   reference this repo's raw URL). Claude picks up the trigger phrases
   automatically.

4. Get your API key at <https://virtualsms.io>.

## What this gets your agent

- **Find the cheapest available number** across 2500+ services and 145+ countries
- **Buy a verification number on demand**, single tool call, returns number + order id
- **Receive SMS codes via WebSocket** (`wait_for_sms`), code lands instantly, no polling loop
- **Or poll on your own schedule** (`get_sms`) for batch / cron jobs
- **Swap a number** that did not deliver, or **cancel + refund** unused orders individually or in bulk
- **Rent a dedicated number** for 1 to 30 days instead of buying a single verification
- **Buy a matching-country proxy** (residential, mobile, or datacenter) so the IP agrees with the number
- **Launch a private cloud browser session** (beta) to drive a signup yourself in a live viewer
- **Account introspection**: balance, transaction history, success rate, lifetime spend

40 MCP tools total. Full reference: [SKILL.md](./SKILL.md).

## Why real SIMs (not VoIP)

Carrier-lookup APIs flag VoIP number ranges. Services that care, including
Tinder, Discord, WhatsApp, OnlyFans, Hinge, and banking apps, silently
reject the verification. VirtualSMS numbers are carrier-issued mobile numbers,
backed by real physical SIM cards on operators like Vodafone, O2 and
T-Mobile, not VoIP, so they resolve as mobile and pass the checks that
block VoIP ranges.

## Compatible services

WhatsApp, Telegram, Tinder, Discord, Instagram, Hinge, Bumble,
OnlyFans, Snapchat, PayPal, Google, Apple, Facebook, TikTok,
Twitter / X, LinkedIn, Uber, Amazon, Netflix, Spotify, GitHub,
Coinbase, Kraken, Binance, MEXC, OKX, Bybit, and 2500+ more.

## Compatible Claude clients

Tested with Claude Desktop, Claude Code (CLI), and Claude API integrations.
Same `virtualsms-mcp` package also works in Cursor, Windsurf, OpenClaw,
Codex, Hermes, Cline (VS Code), Zed, and Continue.dev, see the [parent
mcp-server repo](https://github.com/virtualsms-io/mcp-server) for the
full setup matrix.

## Cross-references

- **Parent MCP server:** <https://github.com/virtualsms-io/mcp-server>
- **npm package:** [`virtualsms-mcp`](https://www.npmjs.com/package/virtualsms-mcp)
- **Project home:** <https://virtualsms.io>
- **MCP page (per-client setup):** <https://virtualsms.io/mcp>
- **Beta cloud browser access:** <https://t.me/VirtualSMS_io>
- **Sister skill repos:**
  [openclaw-skill-sms](https://github.com/virtualsms-io/openclaw-skill-sms) ·
  [cursor-rules-sms-verification](https://github.com/virtualsms-io/cursor-rules-sms-verification) ·
  [windsurf-workflow-sms](https://github.com/virtualsms-io/windsurf-workflow-sms) ·
  [codex-sms-verification](https://github.com/virtualsms-io/codex-sms-verification)

## License

MIT, see [LICENSE](./LICENSE).
