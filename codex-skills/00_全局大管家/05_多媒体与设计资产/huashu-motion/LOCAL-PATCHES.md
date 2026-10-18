# Local patches

- 2026-10-19 integration at upstream `3e927801e78b587878fb7dbb65d616326df00c21`.
- Upstream has no root `SKILL.md`; added this thin router to the nested official skill at `skills/huashu-motion/SKILL.md`. The nested skill body and references are unchanged.
- Removed `docs/media/` (27.5MB README showcase GIFs); README image links now point to the immutable upstream raw URLs at the integrated commit.
- Removed upstream `test/`, `runtime/clip/test/`, `site/`, and ignore/npm-pack metadata because they are development or repository-site assets, not needed to invoke the shipped CLI, runtime, templates, examples, fonts, or skill. `docs/CONTRACT.md` is retained because CLI/project code references it.
