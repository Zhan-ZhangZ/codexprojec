# Local Integration Notes

## 2026-10-21

- Upstream: <https://github.com/zachshallbetter/adobe-mcp>
- Upstream commit: `bd855b746b1ac3a64011bbc92bdf5fd9320fade3`
- Integrated as a documentation and MCP-contract layer because all six application services are published to npm.
- Kept the root README, app READMEs, `server.json` contracts, package licences/notices and the InDesign user-facing docs/examples.
- Removed the monorepo source, tests, CI, development handbook, package locks and development-only configuration.
- Added a Chinese README translated from the upstream root README and a thin routing `SKILL.md`.
- Verified the published `adobe-mcp-suite@0.1.7` package through an MCP initialize/tools-list handshake; this host exposed 447 application-prefixed tools.
