import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const notificationsTools = {
      getSubscription: {
        schema: {
          notificationType: z.string().describe("The notification type"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables")
        },
        handler: async ({ notificationType, marketplaceId }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const data = await makeSpApiRequest(
              'GET',
              `/notifications/v1/subscriptions/${notificationType}`,
              null,
              { marketplaceIds: marketplace }
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting subscription: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns information about a subscription for the specified notification type"
      },
      
      createSubscription: {
        schema: {
          notificationType: z.string().describe("The notification type"),
          payloadVersion: z.string().describe("The version of the payload object to be used in the notification"),
          destinationId: z.string().describe("The identifier for the destination where notifications will be delivered"),
          marketplaceId: z.string().optional().describe("The marketplace ID. Defaults to the one in environment variables")
        },
        handler: async ({ notificationType, payloadVersion, destinationId, marketplaceId }) => {
          try {
            const marketplace = marketplaceId || process.env.SP_API_MARKETPLACE_ID;
            const payload = {
              payloadVersion,
              destinationId
            };
            
            const data = await makeSpApiRequest(
              'POST',
              `/notifications/v1/subscriptions/${notificationType}`,
              payload,
              { marketplaceIds: marketplace }
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error creating subscription: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Creates a subscription for the specified notification type"
      },
      
      getDestinations: {
        schema: {},
        handler: async () => {
          try {
            const data = await makeSpApiRequest(
              'GET',
              '/notifications/v1/destinations'
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting destinations: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns information about all destinations"
      },
      
      createDestination: {
        schema: {
          name: z.string().describe("The name of the destination"),
          resourceSpecification: z.object({
            sqs: z.object({
              arn: z.string().describe("The Amazon Resource Name (ARN) of the SQS queue")
            }).optional(),
            eventBridge: z.object({
              accountId: z.string().describe("The AWS account ID of the event bridge")
            }).optional()
          }).describe("The destination resource specification")
        },
        handler: async ({ name, resourceSpecification }) => {
          try {
            const payload = {
              name,
              resourceSpecification
            };
            
            const data = await makeSpApiRequest(
              'POST',
              '/notifications/v1/destinations',
              payload
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error creating destination: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Creates a destination resource to receive notifications"
      }
    };
