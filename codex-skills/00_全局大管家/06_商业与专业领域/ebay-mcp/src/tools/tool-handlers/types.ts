import type { EbaySellerApi } from '@/api/index.js';

/** Executes a tool against the configured eBay seller API client and parsed arguments. */
export type ToolHandler = (api: EbaySellerApi, args: Record<string, unknown>) => unknown;

/** Lookup table that binds registered tool names to their execution handlers. */
export type ToolHandlerMap = Record<string, ToolHandler>;
