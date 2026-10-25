# Local Integration Notes

## 2026-10-25

- Upstream: <https://github.com/Rumeasiyan/roomsmith>
- Upstream commit: `0e1c042cab0301d270e77575aa2dfbb028a5dab1`
- Added a root `SKILL.md` router because the upstream executable skill is nested at `.claude/skills/interior-design/`; the author's nested skill and six agent definitions are preserved.
- Preserved the Python engine, executable CLI, project templates and schema, worked example, operational documentation, environment example, README, and MIT license.
- Upstream had no Chinese README; added a complete `README.zh-CN.md` translated from the English `README.md`. Commands, paths, tables, dependencies, privacy boundaries, costs, approval gates, and links are retained; deleted showcase images now use fixed upstream commit URLs.
- Removed GitHub issue/PR templates, contribution and conduct governance, citation metadata, tests, documentation-site scaffolding, duplicated site `llms.txt`, showcase media, repository ignore metadata, and the development sentinel in `config/current`.
- Updated retained documentation links that pointed to removed contribution and test files so they resolve to the fixed upstream commit.
- No upstream engine or workflow code was changed.
