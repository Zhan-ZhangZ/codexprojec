# CODE-STYLE.md

The single source of truth for **how code is written** in this repo. Rules record
the desired end-state. Where current code differs, treat the gap as migration
work and close it in the same ownership slice.

> Digest lives in [AGENTS.md](AGENTS.md#conventions); the full guide is here.
> Library and CLI decisions live in [docs/adr/current/](docs/adr/current/).

## Stack & Framework Practices

This repo is TypeScript/Node ESM, MCP SDK, Effect, a Zod compatibility adapter,
Biome, Vitest, and a small MCP Apps React surface.

- MCP tools/transports -> [Model Context Protocol](https://modelcontextprotocol.io)
  and `@modelcontextprotocol/sdk`.
- Effect programs/errors -> [Effect documentation](https://effect.website/docs).
- eBay endpoint behavior -> each generated OpenAPI file plus the matching
  official eBay endpoint URL.

This guide covers repo-specific rules on top of those sources.

## Rules

### Function Form And Exports · [lint: style/noDefaultExport]

Use exported `const` arrow functions for new/migrated exported functions. Keep
named exports only. Existing API area classes may stay classes, but new endpoint
methods should be public arrow properties so the method shape matches the
exported-function style. Tool-loader config files may use `module.exports` only
when the tool cannot load a named export; do not use default exports.

```ts
// chosen
export const buildEndpointParams = (...): QueryParams | undefined => { ... };
public getCustomPolicies = (...): Effect.Effect<Response, EbayApiError> => { ... };
module.exports = vitestConfig; // only in CommonJS loader configs

// not this
export function buildEndpointParams(...) { ... }
export default logger;
```

_Why:_ One visible declaration style for new code, while named exports keep
imports discoverable.

### Effect At Fallible Boundaries · [taste]

Fallible async work returns `Effect.Effect<Success, TaggedError, Requirements>`.
Run it with `Effect.runPromise` only at external boundaries: MCP handlers, HTTP
adapters, and CLI entrypoints. Do not add `try/catch` in endpoint or tool code.

```ts
// chosen
return Effect.tryPromise({
  try: () => this.client.get<Response>(path, params),
  catch: (cause) => new EbayApiError({ method: 'GET', path, cause }),
});

// not this
try {
  return await this.client.get<Response>(path, params);
} catch (error) {
  throw new Error(`Failed: ${getErrorMessage(error)}`);
}
```

_Why:_ Failures stay typed and composable until the protocol/CLI boundary
converts them.

### Tagged Errors · [taste]

Use Effect tagged errors such as `Data.TaggedError('EbayApiError')`. Endpoint
methods should return typed Effects; `runApiRequest` is only for Promise-shaped
call sites that are being migrated in the same ownership slice.

```ts
// chosen
export class EbayApiError extends Data.TaggedError('EbayApiError')<{
  readonly method: 'GET';
  readonly path: string;
  readonly cause: unknown;
}> {}

// not this
throw new Error(`Failed to get custom policies: ${getErrorMessage(error)}`);
```

_Why:_ Tests and callers should assert error tags, not fragile message strings.

### Endpoint Docs · [taste]

Every endpoint-backed API method has TSDoc with `@param`, `@returns`, a small
`@example`, and `@see` linking to the official eBay endpoint URL from the OpenAPI
operation. Exported shared utilities also document every parameter and return
when they cross file boundaries.

````ts
// chosen
/**
 * Builds query params from an endpoint-owned allow-list.
 *
 * @param params - Camel-case local parameter names mapped to eBay wire names and values.
 * @returns A query object for the request adapter, or undefined when every value is omitted.
 *
 * @example
 * ```ts
 * buildEndpointParams({ policyTypes: { wireName: 'policy_types', value } });
 * ```
 */
export const buildEndpointParams = (...): QueryParams | undefined => { ... };

// not this
/** Build params. */
export const buildEndpointParams = (...): QueryParams | undefined => { ... };
````

_Why:_ Endpoint code is documentation-heavy by design because every method
mirrors a public eBay contract.

### Generated Response Types And `@see` · [taste]

Do not invent internal domain models for every endpoint. API methods return
generated eBay DTOs. Public aliases/interfaces built from generated responses
get a concise comment and `@see` to the official endpoint.

```ts
// chosen
/**
 * Response returned by eBay Account API getCustomPolicies.
 *
 * @see https://developer.ebay.com/api-docs/sell/account/resources/custom_policy/methods/getCustomPolicies
 */
export type GetCustomPoliciesResponse = components['schemas']['CustomPolicyResponse'];

// not this
export interface CustomPoliciesModel {
  policies: PolicyRow[];
}
```

_Why:_ The OpenAPI types are the contract; internal models are only for
presentation boundaries.

### Effect-Backed Schema Is The Tool Input SSOT · [taste]

Endpoint/tool input schemas are authored through `@/utils/effectSchema.js`; that
schema is the single source of truth. MCP tools derive `inputSchema` from
`.shape`; `defineTool` decodes raw args through the attached Effect Schema before
handlers run. Zod exists only as the MCP SDK / `zod-to-json-schema`
compatibility carrier inside the adapter boundary. Do not import `zod` directly
from endpoint, tool, API, or shared schema files. Runtime schema factories come
from `@/utils/effectSchema.js`; schema inference/helper types come from
`@/utils/effectSchemaTypes.js`. Do not add compatibility re-export facades or
imported-as aliases just to preserve older import paths.

```ts
// chosen
import { z } from '@/utils/effectSchema.js';

export const getCustomPoliciesInputSchema = z.object({ policyTypes: z.string().optional() });
inputSchema: getCustomPoliciesInputSchema.shape,
handler: (api, args) => Effect.runPromise(api.account.getCustomPolicies(args)),

// not this
import { z } from 'zod';

inputSchema: { policyTypes: z.string().optional() },
handler: (api, args) => api.account.getCustomPolicies(args.policyTypes as string),
```

_Why:_ One schema prevents schema/handler drift while keeping fallible runtime
decode on Effect.

### Schema File Ownership · [taste]

| Surface | Owns |
| --- | --- |
| [`schemas.ts`](https://github.com/YosefHayim/ebay-mcp/blob/v1.15.0/src/tools/schemas.ts) | Shared primitives reused across families |
| `src/schemas/<family>/` | Endpoint/tool input (and optional response) schemas for that family |
| `src/types/**` | Generated eBay DTOs — regenerate with `pnpm run sync`; never hand-edit |

Do not add a third schema home. Family folder names need not match MCP keys
one-to-one; see the map in [ARCHITECTURE.md](ARCHITECTURE.md#family-map-mcp-key--folders).

### Unified Params Builder · [taste]

Endpoint methods own the allowed keys and wire names, then pass them to one
shared params builder. The builder omits undefined/empty values and returns the
endpoint-specific params object. Do not hand-roll query strings or endpoint-local
generic builders.

```ts
// chosen
const params = buildEndpointParams({
  policyTypes: { wireName: 'policy_types', value: input.policyTypes },
});

// not this
const params = input.policyTypes ? { policy_types: input.policyTypes } : undefined;
```

_Why:_ Each endpoint shows its contract while omission/normalization stays
consistent.

### Request Adapter Boundary · [taste]

Endpoint methods assemble only the endpoint path, body, and allowed params, then
call the shared request adapter/client. The adapter owns HTTP execution, auth
headers, logging, rate-limit metadata, JSON/XML parsing, and transport-error
conversion.

```ts
// chosen
const path = `${this.basePath}/custom_policy/`;
return requestGetEffect<GetCustomPoliciesResponse>(this.client, path, params);

// not this
const response = await fetch(url);
if (!response.ok) throw new Error(...);
```

_Why:_ Endpoint files should read as endpoint contracts, not HTTP plumbing.

### Collection Operations · [taste]

Use `Effect.forEach`, `Effect.all`, and `Effect.reduce` when callbacks can fail,
touch I/O, or need concurrency. Keep pure table/view projections as `map`. Use
loops when branching accumulation is clearer. Do not extract one-use row mappers
that only hide object construction.

```ts
// chosen
rows: orders.map((order, index) => ({
  id: order.orderId ?? `order-${index}`,
  cells: { orderId: order.orderId ?? null },
})),

// not this
rows: orders.map(toOrderRow);
```

_Why:_ Presentation field choices should stay visible at the layer that owns the
shape.

### Mapping Fallbacks · [taste]

Do not use semantic display fallbacks such as `?? 'unknown'` or `?? 'N/A'` in
mapping code. Missing display data is `null` or an empty value rendered by the
view. Technical fallback IDs are allowed only when they are not user-visible.

```ts
// chosen
id: order.orderId ?? `order-${index}`,
cells: { orderId: order.orderId ?? null },

// not this
cells: { buyer: order.buyer?.username ?? 'unknown' },
```

_Why:_ Invented values are data corruption in the UI.

### Control Flow · [lint: style/noNestedTernary]

Use explicit assembly and small domain-named helpers when repetition is real. Ban
nested/duplicated ternaries and generic helper names like `joinDefined`.

```ts
// chosen
const query = buildEndpointParams({ ... });
if (!query) return undefined;

// not this
const label = a ? b : c ? d : e;
```

_Why:_ Endpoint and CLI code should be readable under pressure.

### Types And Interfaces · [taste]

Use interfaces for public object contracts, type aliases for
unions/functions/brands/error payload-style shapes, and `readonly` on stable
contracts. Public shared interfaces/types get a concise comment when source,
side effect, or external reference matters.

```ts
// chosen
/** One endpoint-owned query parameter allowed by the shared params builder. */
export interface EndpointParamSpec {
  /** Query-string key expected by eBay, usually snake_case from the OpenAPI spec. */
  readonly wireName: string;
  /** Already-typed local value; undefined and empty strings are omitted. */
  readonly value: string | number | undefined;
}

// not this
type Params = { wireName: string; value?: string | number };
```

_Why:_ Shared object contracts should be inspectable and stable.

### Imports And Filenames · [lint: style/useFilenamingConvention]

Use the `@/` alias for anything outside the current folder and `./sibling.js`
only for same-directory imports. Keep NodeNext `.js` extensions. Hand-written
source/test/UI file basenames must be camelCase. Do not use kebab-case or
snake_case for hand-written file basenames. Generated files, upstream specs,
external docs, and root convention files such as `CODE-STYLE.md` and `AGENTS.md`
keep their upstream or conventional naming.

```ts
// chosen
import { getCustomPoliciesInputSchema } from '@/schemas/account-management/account.js';
import { helper } from './helper.js';

// not this
import { getCustomPoliciesInputSchema } from '../../schemas/account-management/account.js';
```

_Why:_ Imports and filenames should be predictable across `src`, tests, and UI.

If a hand-written source/test/UI filename is introduced or found in kebab-case or
snake_case, rename it in the same diff. This rule is about file basenames; domain
folder slugs and user-facing enum values such as the `token-management` tool
family key are data contracts, not filenames.

### Module Boundaries · [taste]

Shared modules must be dependency-light. `utils/`, `config/`, shared schemas, and
generated types cannot import tool categories or API area modules.
Feature-specific helpers stay beside the feature until reused by at least two
real call sites.

_Why:_ Shared code should not know feature wiring.

### Config And Environment · [lint: style/noProcessEnv]

All env reads go through `src/config/*` validated modules or top-level bootstrap
scripts. Endpoint/API/tool code receives typed config values. Missing config
becomes a typed Effect error when code is migrated.

_Why:_ Env behavior should be validated once and testable.

### Logging And Stdout · [lint: suspicious/noConsole]

MCP STDIO mode never writes to stdout. Runtime modules use the shared logger to
stderr/file transports. Human-facing CLI scripts may print prompts/results to
stdout; reusable modules under `src/utils`, `src/api`, `src/tools`, `src/mcp`,
and `src/auth` should not call `console.*` directly.

_Why:_ stdout is the MCP protocol channel.

### Tool And Handler Shape · [taste]

Tools stay co-located with handlers via `defineTool` by default.
Endpoint-backed handlers validate/brand args, run exactly one endpoint Effect
program, and do no `try/catch`, mapping, or response reshaping except
presentation-only UI maps. Protocol/helper tools that do not mirror an eBay
endpoint (`search`, `fetch`, OAuth token helpers, and API status feed helpers)
own their protocol response at that boundary; keep that shaping local, explicit,
and backed by tagged Effect failures.

Do not reintroduce a separate definitions/ vs handlers/ split. Tool types live
in [`types.ts`](https://github.com/YosefHayim/ebay-mcp/blob/v1.15.0/src/tools/types.ts); each family file under `src/tools/categories/` co-locates
definition and handler via `defineTool`.

_Why:_ Registry entries should make the tool-to-endpoint link obvious.

### UI Boundary · [taste]

React entry files stay tiny archetype apps that render `ViewModel` shapes. eBay
DTO projection lives in [`maps.ts`](https://github.com/YosefHayim/ebay-mcp/blob/v1.15.0/src/tools/ui/maps.ts) as the presentation boundary, with
inline object construction and no one-use row-builder helpers. Keep state local
to each archetype unless two views genuinely share it.

_Why:_ The UI layer owns only presentation, not API normalization.

### React Component Contracts · [taste]

Use function components returning `ReactNode`. Export reusable shared components
by name. Private tiny props can be inline; exported components get a named
interface with meaningful one-line member comments when the contract is not
obvious.

_Why:_ MCP Apps code must stay type-checkable across the server/UI boundary.

### Tests · [taste]

Use behavior names without `should` where practical. Keep unit tests under
`tests/unit/<area>` and integration tests under `tests/integration`. Prefer
focused inline fixtures for small DTOs; extract helpers only when they remove
real duplication across tests.

_Why:_ Test names should read as behavior, not implementation instructions.

### Effect Tests · [taste]

Run successful Effects with `Effect.runPromise(program)` at the test boundary.
Expected failures assert typed tagged errors, not message-only `toThrow`, except
Promise boundary adapters that intentionally convert an Effect failure into a
thrown protocol/CLI error. HTTP/request tests assert endpoint path, method,
params/body, and error tag.

_Why:_ Tests should lock the contract, not prose.

### File And Module Size · [lint: complexity/noExcessiveLinesPerFunction]

Split by purpose. Keep Biome size caps as warnings, not blind split triggers.
Split when a file has multiple jobs, not because endpoint docs, schemas, or
generated declarations are long.

_Why:_ Locality beats shallow files.

### Formatting And Package Management · [lint: formatter]

Biome owns formatting: 2 spaces, single quotes, semicolons, trailing commas, 100
columns. Use `pnpm` for installs and lockfile changes. `npm run ...` remains
acceptable for scripts because the repo documents npm-compatible scripts.

_Why:_ One lockfile keeps installs reproducible.

## Canonical Example

The agreed style assembled on one endpoint slice. It is illustrative
documentation, not a direct patch.

````ts
import { Data, Effect } from 'effect';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { EbayApiClient } from '@/api/client.js';
import type { QueryParams } from '@/api/shared/request.js';
import { customPolicyResponseSchema } from '@/schemas/account-management/account.js';
import type { OutputArgs } from '@/tools/types.js';
import { defineTool } from '@/tools/defineTool.js';
import type { components } from '@/types/sell-apps/account-management/sellAccountV1Oas3.js';
import type { InferEffectSchema } from '@/utils/effectSchemaTypes.js';
import { z } from '@/utils/effectSchema.js';

type GetCustomPoliciesInput = InferEffectSchema<typeof getCustomPoliciesInputSchema>;

/**
 * Response returned by eBay Account API getCustomPolicies.
 *
 * @see https://developer.ebay.com/api-docs/sell/account/resources/custom_policy/methods/getCustomPolicies
 */
export type GetCustomPoliciesResponse = components['schemas']['CustomPolicyResponse'];

/** Input accepted by the MCP tool and Account API method for getCustomPolicies. */
export const getCustomPoliciesInputSchema = z.object({
  /** Comma-delimited custom policy types, e.g. PRODUCT_COMPLIANCE,TAKE_BACK. */
  policyTypes: z.string().optional(),
});

/** API failure returned by endpoint Effects after the request adapter catches transport errors. */
export class EbayApiError extends Data.TaggedError('EbayApiError')<{
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly cause: unknown;
}> {}

/** One endpoint-owned query parameter allowed by the shared params builder. */
export interface EndpointParamSpec {
  /** Query-string key expected by eBay, usually snake_case from the OpenAPI spec. */
  readonly wireName: string;
  /** Already-typed local value; undefined and empty strings are omitted. */
  readonly value: string | number | undefined;
}

/**
 * Builds query params from an endpoint-owned allow-list.
 *
 * @param params - Camel-case local parameter names mapped to their eBay wire names and values.
 * @returns A query object for the request adapter, or undefined when every value is omitted.
 *
 * @example
 * ```ts
 * const params = buildEndpointParams({
 *   policyTypes: { wireName: 'policy_types', value: input.policyTypes },
 * });
 * ```
 */
export const buildEndpointParams = (
  params: Record<string, EndpointParamSpec>,
): QueryParams | undefined => {
  const query: QueryParams = {};

  for (const param of Object.values(params)) {
    if (param.value !== undefined && param.value !== '') {
      query[param.wireName] = param.value;
    }
  }

  return Object.keys(query).length > 0 ? query : undefined;
};

export class AccountApi {
  private readonly basePath = '/sell/account/v1';

  public constructor(private readonly client: EbayApiClient) {}

  /**
   * Retrieves custom policies defined for the seller account.
   *
   * @param input - Optional filter containing comma-delimited custom policy types.
   * @returns An Effect that succeeds with eBay's generated CustomPolicyResponse.
   *
   * @example
   * ```ts
   * const policies = await Effect.runPromise(
   *   accountApi.getCustomPolicies({ policyTypes: 'TAKE_BACK' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/account/resources/custom_policy/methods/getCustomPolicies
   */
  public getCustomPolicies = (
    input: GetCustomPoliciesInput = {},
  ): Effect.Effect<GetCustomPoliciesResponse, EbayApiError> => {
    const path = `${this.basePath}/custom_policy/`;
    const params = buildEndpointParams({
      policyTypes: { wireName: 'policy_types', value: input.policyTypes },
    });

    return Effect.tryPromise({
      try: () => this.client.get<GetCustomPoliciesResponse>(path, params),
      catch: (cause) => new EbayApiError({ method: 'GET', path, cause }),
    });
  };
}

export const accountEntries = [
  defineTool({
    name: 'ebay_get_custom_policies',
    description: 'Retrieve custom policies defined for the seller account',
    inputSchema: getCustomPoliciesInputSchema.shape,
    outputSchema: zodToJsonSchema(customPolicyResponseSchema, {
      name: 'CustomPoliciesResponse',
      $refStrategy: 'none',
    }) as OutputArgs,
    handler: (api, args) => Effect.runPromise(api.account.getCustomPolicies(args)),
  }),
];
````

## Recipes

### Add An API Endpoint + MCP Tool

1. Find the operation in `docs/sell-apps/**/<spec>.json` and copy the official
   eBay docs URL for the method.
2. Add or reuse an Effect-backed input schema from `@/utils/effectSchema.js`.
   The tool derives `inputSchema` from `.shape`.
3. Add generated response aliases from `src/types/**`, with `@see` when exported.
4. Add the API method as an Effect-returning endpoint method with full TSDoc.
5. Build query params through the shared params builder; do not hand-roll query
   strings.
6. Add a co-located `defineTool` entry whose handler runs the Effect at the MCP
   boundary.
7. Add unit tests for path/method/params/body and typed error tags; add
   integration coverage when HTTP behavior changes.
8. Run `npm run typecheck`, `npm run check:ci`, `npm test`, and relevant
   integration tests.

### Add Or Change A CLI Command

1. Export one `run*({ argv, stdio })` function that contains the command journey.
2. Route the bin through the hand-written router; do not add a CLI framework
   unless a new ADR proves the need.
3. TTY with no flags may prompt. Flags or non-TTY must never hang.
4. Machine-consumable commands add `--json` and stable exit codes.
5. Human output may use stdout, color, prompts, and progress; MCP STDIO mode may
   not.

### Add A UI Projection

1. Return generated eBay DTOs from the API layer.
2. Map to `TableViewModel`, `CardViewModel`, `ChartViewModel`, or `StatViewModel`
   only at [`maps.ts`](https://github.com/YosefHayim/ebay-mcp/blob/v1.15.0/src/tools/ui/maps.ts).
3. Keep object construction inline in the mapper that owns the target shape.
4. Use `null`/empty values for missing display data and let the React view render
   the placeholder.

## Exemplars

Current files are temporary exemplars until the Effect migration creates a full
API exemplar:

- [`defineTool.ts`](https://github.com/YosefHayim/ebay-mcp/blob/v1.15.0/src/tools/defineTool.ts) - typed `defineTool`, Effect schema SSOT, and useful
  boundary comments.
- [`host.tsx`](https://github.com/YosefHayim/ebay-mcp/blob/v1.15.0/ui/host.tsx) - concise TSDoc around a real trust boundary and small reusable
  UI primitives.
- [`uiMaps.test.ts`](https://github.com/YosefHayim/ebay-mcp/blob/v1.15.0/tests/unit/tools/uiMaps.test.ts) - behavior-named tests and focused inline
  fixtures.

## Never

- Never use `as any`; narrow or use a documented boundary cast.
- Never add default exports.
- Never add or keep kebab-case or snake_case hand-written source/test/UI file
  basenames.
- Never use `try/catch` in endpoint/tool code when the work can be an Effect.
- Never throw custom untagged errors from migrated API code.
- Never use `?? 'unknown'`, `?? 'N/A'`, or invented semantic display fallbacks in
  maps.
- Never extract one-use `toXRow`/`buildXModel` helpers that only hide object
  construction.
- Never add generic micro-helpers such as `isRecord` or `ensureArray` unless they
  guard a true trust boundary.
- Never add nested or duplicated ternaries.
- Never scatter raw `process.env` outside config/bootstrap.
- Never let reusable runtime modules call `console.*` directly.
- Never hand-edit `src/types/**`; regenerate from OpenAPI.
- Never let a bare CLI invocation hang in non-TTY mode.
