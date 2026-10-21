# Local Integration Notes

## 2026-10-21

- Upstream: <https://github.com/fatihaydost/brand-identity-skill>
- Upstream commit: `532742d7477dba3b744433adf92845642953dc28`
- Upstream version: `1.1.1`
- Added a collection-level `SKILL.md` router because upstream exposes one nested skill at `skills/brand-identity/` and has no root skill entry.
- Kept the nested `SKILL.md`, references, scripts, templates, runtime assets, font/language data and root runtime requirements unchanged.
- Kept `README.md`, licenses, third-party notices and trademark notices.
- Removed development-only and presentation assets: nested Git metadata, Claude plugin packaging, CI, ignore/attribute metadata, changelog, development requirements, tools, tests, evals, demo templates and the generated documentation/image tree.
- Rewrote README image and generated-documentation links to the immutable upstream commit so the retained README remains usable after removing display assets.
- The runtime check `python3 skills/brand-identity/scripts/brand.py check` passes with Python dependencies, cached uv environment and a discovered Chromium browser.
- Upstream tests pass with the declared development dependencies under uv: `487 tests`, `7 skipped`, `OK`. Running them with the system Python alone fails on missing `fontTools`, `pathops` and other declared packages; this is an environment requirement, not a source defect.
- The reference scan reports 17 paths. Fifteen document runtime inputs/outputs created by the commands; two cite upstream development-only catalogue/experiment tools. No static execution dependency is missing.
