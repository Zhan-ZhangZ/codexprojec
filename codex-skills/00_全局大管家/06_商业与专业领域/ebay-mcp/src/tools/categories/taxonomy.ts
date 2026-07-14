import { z } from 'zod';
import { defineTool } from '@/tools/define-tool.js';
import type { ToolEntry } from '@/tools/registry.js';

/** Taxonomy API tools for category trees, category suggestions, and compatibility metadata. */
export const taxonomyEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_get_default_category_tree_id',
    description: 'Get the default category tree ID for a marketplace',
    inputSchema: {
      marketplaceId: z.string().describe('Marketplace ID (e.g., EBAY_US)'),
    },
    outputSchema: {
      type: 'object',
      properties: {
        categoryTreeId: { type: 'string' },
        categoryTreeVersion: { type: 'string' },
      },
      description: 'Default category tree ID response',
    },
    handler: (api, args) => api.taxonomy.getDefaultCategoryTreeId(args.marketplaceId),
  }),
  defineTool({
    name: 'ebay_get_category_tree',
    description: 'Get category tree by ID',
    inputSchema: {
      categoryTreeId: z.string().describe('Category tree ID'),
    },
    outputSchema: {
      type: 'object',
      properties: {
        categoryTreeId: { type: 'string' },
        categoryTreeVersion: { type: 'string' },
        rootCategoryNode: { type: 'object' },
      },
      description: 'Category tree details',
    },
    handler: (api, args) => api.taxonomy.getCategoryTree(args.categoryTreeId),
  }),
  defineTool({
    name: 'ebay_get_category_suggestions',
    description: 'Get category suggestions based on query',
    inputSchema: {
      categoryTreeId: z.string().describe('Category tree ID'),
      query: z.string().describe('Search query for category suggestions'),
    },
    outputSchema: {
      type: 'object',
      properties: {
        categorySuggestions: { type: 'array' },
      },
      description: 'Category suggestions response',
    },
    handler: (api, args) => api.taxonomy.getCategorySuggestions(args.categoryTreeId, args.query),
  }),
  defineTool({
    name: 'ebay_get_item_aspects_for_category',
    description: 'Get item aspects for a specific category',
    inputSchema: {
      categoryTreeId: z.string().describe('Category tree ID'),
      categoryId: z.string().describe('Category ID'),
    },
    outputSchema: {
      type: 'object',
      properties: {
        aspects: { type: 'array' },
      },
      description: 'Item aspects for category',
    },
    handler: (api, args) =>
      api.taxonomy.getItemAspectsForCategory(args.categoryTreeId, args.categoryId),
  }),
];
