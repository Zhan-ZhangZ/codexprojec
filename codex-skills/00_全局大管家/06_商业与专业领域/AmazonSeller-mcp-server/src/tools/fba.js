import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const fbaTools = {
      getInboundEligibility: {
        schema: {
          asin: z.string().describe("The ASIN of the item"),
          programType: z.enum(['INBOUND', 'COMMINGLING']).describe("The program type to check eligibility against"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables")
        },
        handler: async ({ asin, programType, marketplaceId }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const data = await makeSpApiRequest(
              'GET',
              '/fba/inbound/v1/eligibility/inboundEligibility',
              null,
              {
                asin,
                program: programType,
                marketplaceIds: marketplace
              }
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting inbound eligibility: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns the eligibility status of an item for the specified program"
      },
      
      getInventorySummaries: {
        schema: {
          details: z.boolean().optional().describe("When true, returns inventory summaries with additional summarized inventory details"),
          granularityType: z.enum(['Marketplace', 'ASIN', 'Seller']).describe("The granularity type for the inventory aggregation level"),
          granularityId: z.string().optional().describe("The granularity ID for the inventory aggregation level"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables")
        },
        handler: async ({ details, granularityType, granularityId, marketplaceId }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const queryParams = {
              details: details ? 'true' : 'false',
              granularityType,
              marketplaceIds: marketplace
            };
            
            if (granularityId) {
              queryParams.granularityId = granularityId;
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
              content: [{ type: "text", text: `Error getting inventory summaries: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns a list of inventory summaries for the specified criteria"
      },
      
      getShipments: {
        schema: {
          shipmentStatusList: z.array(z.string()).optional().describe("A list of ShipmentStatus values"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables"),
          queryType: z.enum(['SHIPMENT', 'DATE_RANGE', 'NEXT_TOKEN']).describe("Indicates whether to return shipments based on the shipmentStatusList, the shipmentIdList, or a date range"),
          nextToken: z.string().optional().describe("A string token returned in the response to your previous request")
        },
        handler: async ({ shipmentStatusList, marketplaceId, queryType, nextToken }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const queryParams = {
              QueryType: queryType,
              MarketplaceId: marketplace
            };
            
            if (shipmentStatusList && shipmentStatusList.length > 0) {
              queryParams.ShipmentStatusList = shipmentStatusList.join(',');
            }
            
            if (nextToken) {
              queryParams.NextToken = nextToken;
            }
            
            const data = await makeSpApiRequest(
              'GET',
              '/fba/inbound/v0/shipments',
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting shipments: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns a list of inbound shipments based on the specified criteria"
      }
    };
