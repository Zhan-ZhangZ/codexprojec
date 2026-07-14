import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const catalogTools = {
      getCatalogItem: {
        schema: {
          asin: z.string().describe("The Amazon Standard Identification Number (ASIN) of the item"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables")
        },
        handler: async ({ asin, marketplaceId }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const data = await makeSpApiRequest(
              'GET',
              `/catalog/2022-04-01/items/${asin}`,
              null,
              { marketplaceIds: marketplace }
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving catalog item: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get details about a specific catalog item by ASIN"
      },
      
      searchCatalogItems: {
        schema: {
          keywords: z.string().describe("Keywords to search for"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables"),
          includedData: z.array(z.string()).optional().describe("Additional data to include in the response")
        },
        handler: async ({ keywords, marketplaceId, includedData }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const queryParams = {
              keywords,
              marketplaceIds: marketplace
            };
            
            if (includedData && includedData.length > 0) {
              queryParams.includedData = includedData.join(',');
            }
            
            const data = await makeSpApiRequest(
              'GET',
              '/catalog/2022-04-01/items',
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error searching catalog items: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Search for catalog items by keywords"
      }
    };
