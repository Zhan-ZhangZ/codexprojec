# Local Integration Notes

## 2026-10-25

- Upstream: <https://github.com/kaankiziltug/logo-design-skill>
- Upstream commit: `734090317a2155c5bf1ae8bd4cc85c6848a0128f`
- Upstream version: `1.4.5`
- Added a collection-level `SKILL.md` router because upstream exposes its executable skill at `skills/logo-design/`.
- Kept the complete nested skill: workflow, references, dependency-free Python tools, templates, 1,400+ SVG reference library and the README example images.
- Kept `README.md`, `LICENSE` and `TRADEMARKS.md`; added a complete Chinese README.
- Removed Claude plugin packaging, CI, evals, tests, the installation/packaging tool directory and nested Git/ignore metadata.
- Updated the README's removed packaging-tool reference to point to upstream release packaging.
- Replaced one documentation-only placeholder path with a shell variable so the reference scan resolves against the packaged tree.
- Verified the library search, SVG audit, Python compilation, renderer discovery and the upstream unit tests.
