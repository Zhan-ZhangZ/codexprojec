# Local Integration Notes

## 2026-10-21

- Upstream: <https://github.com/ishu86/after-effects-mcp>
- Upstream commit: `5223c17a8e8c1273b25c6a9d306839259ad35143`
- Upstream npm package: `ae-mcp@1.0.0`
- Integrated the MCP server through npm and kept the required After Effects CEP panel, panel installers, native skill and examples.
- Removed TypeScript source, tests, CI, package lock and development configuration from the skill payload.
- Added a Chinese README translated from the upstream README and adapted installation to the published npm package plus the locally bundled CEP panel.
- Added a root router that requires the CEP panel to be installed and open before After Effects tool calls.
- Verified `ae-mcp@1.0.0` can be fetched and started from npm. It correctly refuses the MCP connection when After Effects is not running; the CEP panel and application are required for a tools/list smoke test.
