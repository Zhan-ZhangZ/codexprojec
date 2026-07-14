# Architecture Deepening Opportunities

Date: 2026-05-09

Status: findings only. No implementation changes are proposed in this document.

## Context

This repository does not currently have `CONTEXT.md`, `CONTEXT-MAP.md`, or ADR files. These findings therefore use vocabulary from the real codebase:

- MCP tool registration and execution
- eBay seller category modules
- OAuth token and credential setup
- STDIO and HTTP transports
- Trading XML support
- Generated OpenAPI type surfaces

Use the architecture vocabulary from the `improve-codebase-architecture` skill:

- Module
- Interface
- Implementation
- Depth
- Seam
- Adapter
- Leverage
- Locality

The current working tree already contains staged architecture work, including:

- `src/tools/registry.ts`
- `src/tools/handlers.ts`
- `src/tools/contracts.ts`
- `src/mcp/runtime.ts`
- `src/api/shared/request.ts`
- `src/auth/credential-session.ts`

These findings are written against that current staged shape, not the original large-switch implementation.

## Suggested Execution Order

1. Deepen MCP tool execution.
2. Deepen eBay endpoint request mechanics.
3. Deepen HTTP transport.
4. Deepen OAuth credential session.
5. Deepen tool contract schemas.

This order starts where the current staged refactor still concentrates the most churn, then moves through request mechanics, transport runtime, sensitive credential behavior, and finally schema ownership.

## 1. Deepen MCP Tool Execution

Files:

- `src/tools/handlers.ts`
- `src/tools/registry.ts`
- `src/tools/definitions/*.ts`
- `tests/unit/tools/*`

Problem:

The registry Module is now useful, but the handler Module is still shallow. One 2,439-line object owns every tool's argument casting, connector behavior, token behavior, and eBay seller category routing. Adding or changing a tool still requires understanding both the definition file and the central handler table.

Deletion test:

Deleting `src/tools/handlers.ts` would not remove complexity. It would reappear across category definitions because every tool still needs argument validation, category dispatch, and result shaping. The Module is earning its keep, but its Interface is too broad for the amount of Locality callers get.

Solution:

Move tool handlers next to their category definitions, so each eBay seller category Module owns its MCP definition and execution mapping. Keep `src/tools/registry.ts` as the single registry seam that assembles entries and validates uniqueness, missing handlers, and orphan handlers.

Benefits:

Better Locality when adding or changing a tool. Better Leverage from registry validation because definitions and handlers stop drifting apart. Tests can continue to target the registry Interface instead of asserting behavior through a central table.

Test direction:

- Assert every registered tool has a unique name.
- Assert every registered tool has a handler.
- Assert category tool handlers call the expected eBay seller category module.
- Preserve current public MCP tool names.

## 2. Deepen eBay Endpoint Request Mechanics

Files:

- `src/api/shared/request.ts`
- `src/api/shared/query-params.ts`
- `src/api/listing-management/inventory.ts`
- `src/api/listing-metadata/metadata.ts`
- `src/api/communication/*`
- Other `src/api/**` category modules

Problem:

A shared request Module exists, but endpoint Modules still vary between `withApiError`, communication-specific helpers, and manual try/catch validation. Category Modules repeat the same Implementation pattern: validate required IDs, validate objects, build endpoint paths, build query params, call `client.get/post/put/delete`, and wrap errors with endpoint context.

Deletion test:

Deleting the repeated validation/path/error snippets would push the same mechanics back into every endpoint method. The category names are useful, but common endpoint mechanics should be concentrated behind a deeper Module.

Solution:

Concentrate endpoint path building, required values, object checks, query params, and error wrapping behind one request Module. Keep domain category Modules as the Interface for concepts like Inventory Item, Offer, Marketplace Policy, Order, Notification, and Trading Listing.

Benefits:

Better Locality for eBay request rules and error behavior. Better Leverage because pagination, required IDs, path params, object validation, and error wrapping can be fixed once.

Test direction:

- Test ID validation, object validation, pagination validation, query param building, and error wrapping through the shared request Module.
- Reduce category tests to domain mapping assertions.
- Preserve current category method names where they are part of internal call sites.

## 3. Deepen HTTP Transport

Files:

- `src/server-http.ts`
- `src/mcp/runtime.ts`
- `src/auth/oauth-metadata.ts`
- `src/auth/oauth-middleware.ts`
- `src/auth/token-verifier.ts`

Problem:

The shared MCP runtime Module now exists, but HTTP transport still mixes environment parsing, OAuth metadata, Express middleware, session transport storage, icon metadata, request logging, MCP session handling, and process startup in one entrypoint.

Deletion test:

Deleting HTTP session logic from `src/server-http.ts` would push it into another large transport entrypoint. The transport behavior is real and should stay behind a Module, but the current file exposes too much Implementation detail to every maintainer touching HTTP startup.

Solution:

Keep `src/server-http.ts` as a thin entrypoint and move HTTP session/auth/runtime wiring into a transport Module. Let `src/mcp/runtime.ts` remain responsible only for MCP server construction and tool registration.

Benefits:

Better Locality for HTTP-only behavior while preserving Leverage from the shared MCP runtime across STDIO and HTTP.

Test direction:

- Unit test HTTP session creation and invalid session responses through the HTTP transport Module.
- Keep startup tests focused on configuration validation and listen/shutdown behavior.
- Assert HTTP and STDIO still use the same MCP runtime registry.

## 4. Deepen OAuth Credential Session

Files:

- `src/auth/credential-session.ts`
- `src/auth/oauth.ts`
- `src/tools/handlers.ts`
- `src/scripts/setup.ts`
- `src/scripts/interactive-setup.ts`
- `src/scripts/setup-shared.ts`

Problem:

Credential display and `.env` storage were extracted, but token exchange, refresh, expiry rules, persistence, masking, setup verification, and MCP token tool behavior remain spread across auth, setup scripts, and tool handlers. This is sensitive behavior and has real variation between runtime, setup, and tests.

Deletion test:

Deleting token persistence/update logic would push credential file handling, masking, expiry, and status behavior back into setup scripts and MCP token tools. This is a real seam that needs a deeper Module.

Solution:

Make credential session the Module that owns token lifecycle behavior: loading, persistence, masking, refresh status, expiry calculation, and display-safe status output. Use adapters for `.env` storage and tests.

Benefits:

Better Locality for sensitive state. Better Leverage because setup flows and MCP token tools would cross the same tested Interface.

Test direction:

- Test credential status without exposing raw secrets.
- Test env-file persistence through an Adapter, not `process.cwd()` directly.
- Test refresh-token expiry and fallback behavior.
- Keep public token tool names stable.

## 5. Deepen Tool Contract Schemas

Files:

- `src/tools/contracts.ts`
- `src/tools/definitions/*.ts`
- `src/tools/schemas.ts`
- `src/schemas/**`
- `src/utils/**`
- `src/types/**/*.ts`

Problem:

`src/tools/contracts.ts` validates presence, but schema ownership is still spread across definition files, broad tool schemas, category schemas, utility validators, and generated OpenAPI types. Handlers compensate with many `as string`, `as number`, and `as Record<string, unknown>` casts.

Deletion test:

Deleting one schema surface does not remove complexity. It reappears in another schema file or in the handler itself. That means tool contract ownership is not local enough.

Solution:

Make one category-owned MCP contract catalog the source for input and output schemas. Generated eBay types should remain underneath; MCP-specific input and output schemas should live in consistent category locations and be imported by tool definitions and handlers.

Benefits:

Better Locality for schema drift. Better Leverage because every exposed MCP tool can be verified from one catalog shape.

Test direction:

- Assert every exposed MCP tool has an input schema.
- Assert output schemas exist for tools where the project already models output.
- Add consistency tests that detect duplicate schema ownership for the same tool.
- Reduce handler-level casts by deriving handler argument types from tool contracts where practical.

## Guardrails

- Preserve public MCP tool names.
- Preserve HTTP and STDIO entrypoints.
- Do not change eBay REST or Trading endpoint behavior unless covered by tests.
- Keep generated OpenAPI types generated; do not manually refactor generated files.
- Add `CONTEXT.md` only if new domain terms are introduced during design.
- Add ADRs only when rejecting a candidate for a durable architectural reason.

## Verification Commands

Use the package scripts already present in `package.json`:

```bash
pnpm typecheck
pnpm test
pnpm check
```

If a narrower change is made, run the focused Vitest file first, then the full suite.
