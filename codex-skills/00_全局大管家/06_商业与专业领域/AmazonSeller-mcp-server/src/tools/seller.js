import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const sellerTools = {
      getMarketplaceParticipations: {
        schema: {},
        handler: async () => {
          try {
            const data = await makeSpApiRequest(
              'GET',
              '/sellers/v1/marketplaceParticipations'
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting marketplace participations: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns a list of marketplaces that the seller participates in"
      }
    };
