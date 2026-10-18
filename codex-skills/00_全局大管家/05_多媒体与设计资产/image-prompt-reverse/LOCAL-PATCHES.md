# Local patches

- 2026-10-18 integration adaptation: translated the upstream `SKILL.md` frontmatter `description` into a Chinese-facing registry description, and added `metadata.upstream` pointing to `https://github.com/LunarXuan/image-prompt-reverse`, to satisfy source-registry discoverability and traceability requirements. The author body below the frontmatter is retained from upstream commit `4dead0a32e2312e56a14ebf3658ee75c9b865055`.
- Verification: the staged reference gate, manifest validator, immutable catalog check, YAML-aware MCP payload audit, and the local MCP gateway discovery / materialization / file-addressing / status calls all passed on branch `feat/image-prompt-reverse-20261018`.
