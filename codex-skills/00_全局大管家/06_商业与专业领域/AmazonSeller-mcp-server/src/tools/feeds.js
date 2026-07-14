import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const feedsTools = {
      createFeed: {
        schema: {
          feedType: z.string().describe("The feed type"),
          marketplaceIds: z.array(z.string()).optional().describe("A list of marketplace IDs"),
          inputFeedDocumentId: z.string().describe("The document ID of the feed content")
        },
        handler: async ({ feedType, marketplaceIds, inputFeedDocumentId }) => {
          try {
            const payload = {
              feedType,
              marketplaceIds: marketplaceIds || [process.env.SP_API_MARKETPLACE_ID],
              inputFeedDocumentId
            };
            
            const data = await makeSpApiRequest(
              'POST',
              '/feeds/2021-06-30/feeds',
              payload
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error creating feed: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Create a feed"
      },
      
      getFeed: {
        schema: {
          feedId: z.string().describe("The feed ID")
        },
        handler: async ({ feedId }) => {
          try {
            const data = await makeSpApiRequest(
              'GET',
              `/feeds/2021-06-30/feeds/${feedId}`
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving feed: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get information about a feed"
      },
      
      getFeedDocument: {
        schema: {
          feedDocumentId: z.string().describe("The feed document ID")
        },
        handler: async ({ feedDocumentId }) => {
          try {
            const data = await makeSpApiRequest(
              'GET',
              `/feeds/2021-06-30/documents/${feedDocumentId}`
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving feed document: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get information about a feed document"
      }
    };
