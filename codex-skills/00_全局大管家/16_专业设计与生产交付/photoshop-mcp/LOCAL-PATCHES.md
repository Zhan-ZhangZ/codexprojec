# Local Integration Notes

## 2026-10-21

- Upstream: <https://github.com/alisaitteke/photoshop-mcp>
- Upstream commit: `ba36d8f2a28ecc56686568f3c0191e388336d498`
- Upstream npm package: `@alisaitteke/photoshop-mcp@1.7.37`
- Integrated as an npm MCP documentation and agent-skill layer.
- Kept the English and Simplified Chinese READMEs, two native Photoshop sub-skills, tool/prompt/UI/security/troubleshooting docs, example MCP configs, registry metadata, licence and optional UXP bridge plugin.
- Removed source, tests, build scripts, site/web assets, CI, plugin packaging, marketing images and non-Chinese/English README variants.
- Rewrote retained README display/development/contribution links to the immutable upstream commit.
- Refreshed the upstream Simplified Chinese README where it lagged the English source: version `1.7.37`, 128 tools (111 atomic + 17 recipes), 24 prompts, current tool counts and Jev intent routing are now documented.
- Verified `@alisaitteke/photoshop-mcp@1.7.37` through an MCP initialize/tools-list handshake; it registered 128 tools and 24 prompts.
