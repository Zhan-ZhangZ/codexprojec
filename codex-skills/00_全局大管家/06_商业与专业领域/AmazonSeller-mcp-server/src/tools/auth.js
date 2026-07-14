import { z } from 'zod';
    import { getAccessToken } from '../utils/auth.js';

    export const authTools = {
      getAccessToken: {
        schema: {},
        handler: async () => {
          try {
            const token = await getAccessToken();
            return {
              content: [{ 
                type: "text", 
                text: `Access token retrieved successfully. Token: ${token.substring(0, 10)}...` 
              }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving access token: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get an access token for Amazon SP-API"
      },
      
      checkCredentials: {
        schema: {},
        handler: async () => {
          try {
            await getAccessToken();
            return {
              content: [{ type: "text", text: "Credentials are valid and working correctly." }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Credentials check failed: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Check if the SP-API credentials are valid"
      }
    };
