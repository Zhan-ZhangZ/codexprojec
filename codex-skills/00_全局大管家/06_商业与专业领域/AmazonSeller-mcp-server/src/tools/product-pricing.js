import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const productPricingTools = {
      getPricing: {
        schema: {
          itemType: z.enum(['Asin', 'Sku']).describe("Indicates whether ASIN values or seller SKU values are used to identify items"),
          itemIds: z.array(z.string()).describe("A list of item identifiers"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables")
        },
        handler: async ({ itemType, itemIds, marketplaceId }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const queryParams = {
              ItemType: itemType,
              ItemIds: itemIds.join(','),
              MarketplaceId: marketplace
            };
            
            const data = await makeSpApiRequest(
              'GET',
              '/products/pricing/v0/price',
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting pricing: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns pricing information for a list of products"
      },
      
      getCompetitivePricing: {
        schema: {
          itemType: z.enum(['Asin', 'Sku']).describe("Indicates whether ASIN values or seller SKU values are used to identify items"),
          itemIds: z.array(z.string()).describe("A list of item identifiers"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables")
        },
        handler: async ({ itemType, itemIds, marketplaceId }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const queryParams = {
              ItemType: itemType,
              ItemIds: itemIds.join(','),
              MarketplaceId: marketplace
            };
            
            const data = await makeSpApiRequest(
              'GET',
              '/products/pricing/v0/competitivePrice',
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting competitive pricing: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns competitive pricing information for a list of products"
      },
      
      getListingOffers: {
        schema: {
          sellerSku: z.string().describe("The seller SKU of the item"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables"),
          itemCondition: z.enum(['New', 'Used', 'Collectible', 'Refurbished', 'Club']).describe("The condition of the item")
        },
        handler: async ({ sellerSku, marketplaceId, itemCondition }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const data = await makeSpApiRequest(
              'GET',
              `/products/pricing/v0/listings/${sellerSku}/offers`,
              null,
              {
                MarketplaceId: marketplace,
                ItemCondition: itemCondition
              }
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting listing offers: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns the lowest priced offers for a single SKU listing"
      }
    };
