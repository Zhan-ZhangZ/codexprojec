# 0003 — Dependency decisions

**Status:** Accepted · 2026-07-02 · refreshed 2026-07-06

## Context

Audit of `package.json` while codifying code style. Findings:

- **`jsonwebtoken`** (+ `@types/jsonwebtoken`) is a dependency with **zero
  imports** in `src/`. JWT verification is done with **`jose`**
  (`src/auth/token-verifier.ts`).
- ADR [0006](0006-close-style-backlog.md) removed `commander` because it was
  unused. ADR [0002](0002-cli-command-surface.md) keeps the dual-mode CLI
  contract but now uses the existing hand-written router.
- API and IO code is migrating from throw-based helpers to typed Effect programs;
  `CODE-STYLE.md` makes Effect the target style for new and migrated API paths.
- Several majors are available (Zod 4, TypeScript 6, Vite 8) but touch generated
  types / build semantics broadly.

## Decision

- **Remove** `jsonwebtoken` and `@types/jsonwebtoken` (dead).
- **Keep** `jose` as the sole JWT library.
- **Add** `effect` as a runtime dependency for typed API/IO workflows.
- **Do not add** `commander` unless a future ADR proves the small hand router is
  no longer enough.
- **Keep** Zod v3 and `zod-to-json-schema` as the MCP/tool schema source of
  truth. Do not adopt Effect Schema in this change set.
- **Defer** the Zod 4 / TypeScript 6 / Vite 8 majors — out of scope for this
  change set; each warrants its own change with the generated-types regen and
  test pass.

`CODE-STYLE.md` documents how to _use_ libraries (Effect, Zod-shape SSOT,
`getErrorMessage`); this ADR records the keep/add/remove.

## Consequences

- Removing `jsonwebtoken` shrinks the dependency surface with no code change.
- Adding `effect` makes the migration target explicit in `package.json` and
  `pnpm-lock.yaml`.
- Existing throw-based API helpers remain migration backlog.
- Zod 4 and schema replacement remain out of scope until a dedicated PR proves
  the generated-schema impact.
- `pnpm-lock.yaml` is regenerated so `pnpm install --frozen-lockfile` (CI) stays
  green.
