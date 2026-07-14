import { marketingTools } from '@/tools/definitions/marketing.js';
import { marketingHandlers } from '@/tools/tool-handlers/marketing.js';
import type { ToolEntry } from '@/tools/registry.js';

/**
 * Marketing tools are integrated by pairing the existing definition catalog with
 * the existing handler map, rather than being re-expressed through `defineTool`
 * like the other categories. Two properties of this area make co-location via the
 * typed factory inappropriate:
 *
 *  1. `src/api/marketing-and-promotions/marketing.ts` is excluded from `tsconfig`,
 *     so `api.marketing.*` is untyped — `defineTool` would add no type safety here.
 *  2. Several marketing handlers intentionally read a broader argument shape than
 *     their advertised input schema (e.g. `ebay_get_ad_report`, `ebay_update_ad_bid`).
 *     Because the MCP transport strips arguments to the declared input schema before
 *     invoking the handler, those extra reads already resolve to `undefined` in
 *     production. Pairing the arrays preserves that behavior exactly; re-expressing
 *     it through `defineTool` would either bake the mismatch in as literal `undefined`
 *     arguments or silently change behavior. These divergences are tracked separately.
 *
 * Pairing keeps the registry contract identical (definition + handler per tool)
 * while leaving the marketing definition/handler source files in place.
 */
const registeredMarketingNames = new Set(marketingTools.map((definition) => definition.name));

/** Registered marketing tools, paired definition-to-handler by name. */
export const marketingEntries: ToolEntry[] = marketingTools.map((definition) => ({
  definition,
  handler: marketingHandlers[definition.name],
}));

/**
 * Marketing handlers that have no registered definition (currently only
 * `ebay_get_ad_report_metadata_for_report_type`). They remain callable via
 * `executeTool` but are not advertised to MCP clients, preserving prior behavior
 * where these handlers existed without a definition.
 */
export const marketingHandlerOnlyEntries: ToolEntry[] = Object.entries(marketingHandlers)
  .filter(([name]) => !registeredMarketingNames.has(name))
  .map(([name, handler]) => ({
    definition: { name, description: '', inputSchema: {} },
    handler,
  }));
