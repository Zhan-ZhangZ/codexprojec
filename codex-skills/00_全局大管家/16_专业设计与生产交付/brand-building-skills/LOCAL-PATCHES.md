# Local Integration Notes

## 2026-10-21

- Upstream: <https://github.com/arnabbagxd/Brand-building-skills>
- Upstream commit: `4a0a8b5b7a0f64bf0fc551978a18a591670a5223`
- Upstream version: `1.2.0`
- Added a collection-level `SKILL.md` router because upstream provides only 29 nested skills and no root skill entry.
- Added upstream, version, and execution boundaries to the router. The 29 nested `SKILL.md` files remain byte-for-byte unchanged.
- Removed upstream Git metadata and ignore rules, the Claude plugin manifest, agent and contribution guidance, release-history notes, the development validation script, and four evaluation directories.
- Kept `README.md`, `LICENSE`, and all nested skill instructions. The retained README still narrates upstream contribution and validation workflows whose files were intentionally removed; these references are not part of skill execution.
- Preserved one upstream trailing space in the `brand-naming` sub-skill. It is a formatting-only issue and does not affect parsing or execution.

## 2026-10-21 — Chinese README

- Added `README.zh-CN.md`, a Chinese translation based on upstream `v1.2.0` at commit `4a0a8b5b7a0f64bf0fc551978a18a591670a5223`.
- Kept the upstream `README.md` unchanged as the English source of truth.
- Updated the collection router to point Chinese users to the translated README first, while retaining the English original for comparison.
