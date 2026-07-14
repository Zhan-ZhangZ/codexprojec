import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const ordersTools = {
      getOrders: {
        schema: {
          createdAfter: z.string().optional().describe("Orders created after this date (ISO 8601 format)"),
          createdBefore: z.string().optional().describe("Orders created before this date (ISO 8601 format)"),
          orderStatuses: z.array(z.string()).optional().describe("Filter by order status"),
          marketplaceIds: z.array(z.string()).optional().describe("List of marketplace IDs")
        },
        handler: async ({ createdAfter, createdBefore, orderStatuses, marketplaceIds }) => {
          try {
            const queryParams = {
              MarketplaceIds: marketplaceIds || [process.env.SP_API_MARKETPLACE_ID]
            };
            
            if (createdAfter) {
              queryParams.CreatedAfter = createdAfter;
            }
            
            if (createdBefore) {
              queryParams.CreatedBefore = createdBefore;
            }
            
            if (orderStatuses && orderStatuses.length > 0) {
              queryParams.OrderStatuses = orderStatuses.join(',');
            }
            
            const data = await makeSpApiRequest(
              'GET',
              '/orders/v0/orders',
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving orders: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get orders based on specified filters"
      },
      
      getOrder: {
        schema: {
          orderId: z.string().describe("The order ID")
        },
        handler: async ({ orderId }) => {
          try {
            const data = await makeSpApiRequest(
              'GET',
              `/orders/v0/orders/${orderId}`
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving order: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get details for a specific order"
      },
      
      getOrderItems: {
        schema: {
          orderId: z.string().describe("The order ID")
        },
        handler: async ({ orderId }) => {
          try {
            const data = await makeSpApiRequest(
              'GET',
              `/orders/v0/orders/${orderId}/orderItems`
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving order items: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get items for a specific order"
      }
    };
