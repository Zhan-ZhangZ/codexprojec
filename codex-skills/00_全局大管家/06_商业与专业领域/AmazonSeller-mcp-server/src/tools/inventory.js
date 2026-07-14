import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const inventoryTools = {
      getInventorySummaries: {
        schema: {
          sellerSkus: z.array(z.string()).optional().describe("A list of seller SKUs to get inventory summaries for"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables"),
          granularityType: z.enum(['Marketplace', 'ASIN', 'Seller']).default('Marketplace').describe("The granularity type for the inventory aggregation level"),
          granularityId: z.string().optional().describe("The granularity ID for the inventory aggregation level")
        },
        handler: async ({ sellerSkus, marketplaceId, granularityType, granularityId }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const queryParams = {
              marketplaceIds: marketplace,
              granularityType
            };
            
            if (granularityId) {
              queryParams.granularityId = granularityId;
            }
            
            if (sellerSkus && sellerSkus.length > 0) {
              queryParams.sellerSkus = sellerSkus.join(',');
            }
            
            const data = await makeSpApiRequest(
              'GET',
              '/fba/inventory/v1/summaries',
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving inventory summaries: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get inventory summaries for the specified seller SKUs"
      },
      
      updateInventory: {
        schema: {
          sellerSku: z.string().describe("The seller SKU for which to update the inventory"),
          quantity: z.number().int().describe("The new available quantity"),
          fulfillmentLatency: z.number().int().optional().describe("The new fulfillment latency in days")
        },
        handler: async ({ sellerSku, quantity, fulfillmentLatency }) => {
          try {
            const payload = {
              inventory: {
                sellerSku,
                availableQuantity: quantity
              }
            };
            
            if (fulfillmentLatency !== undefined) {
              payload.inventory.fulfillmentLatency = fulfillmentLatency;
            }
            
            const data = await makeSpApiRequest(
              'PUT',
              `/inventory/v1/inventories/${sellerSku}`,
              payload
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error updating inventory: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Update the inventory level for a specific SKU"
      }
    };
