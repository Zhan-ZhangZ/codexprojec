import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
    import { catalogTools } from './tools/catalog.js';
    import { inventoryTools } from './tools/inventory.js';
    import { ordersTools } from './tools/orders.js';
    import { reportsTools } from './tools/reports.js';
    import { feedsTools } from './tools/feeds.js';
    import { financeTools } from './tools/finance.js';
    import { notificationsTools } from './tools/notifications.js';
    import { authTools } from './tools/auth.js';
    import { sellerTools } from './tools/seller.js';
    import { fbaTools } from './tools/fba.js';
    import { productPricingTools } from './tools/product-pricing.js';
    import { listingsTools } from './tools/listings.js';
    import { apiDocs } from './resources/api-docs.js';

    // Create an MCP server for Amazon SP-API
    const server = new McpServer({
      name: "Amazon Selling Partner API",
      version: "1.0.0",
      description: "MCP Server for interacting with Amazon Selling Partner API"
    });

    // Register all tools
    const registerToolsFromModule = (toolsModule) => {
      Object.entries(toolsModule).forEach(([name, toolConfig]) => {
        server.tool(
          name,
          toolConfig.schema,
          toolConfig.handler,
          { description: toolConfig.description }
        );
      });
    };

    // Register API documentation resources
    server.resource(
      "api_docs",
      new ResourceTemplate("amazon-sp-api://{category}", { list: undefined }),
      async (uri, { category }) => {
        if (!apiDocs[category]) {
          return {
            contents: [{
              uri: uri.href,
              text: `Documentation for category '${category}' not found. Available categories: ${Object.keys(apiDocs).join(', ')}`
            }]
          };
        }
        
        return {
          contents: [{
            uri: uri.href,
            text: apiDocs[category]
          }]
        };
      }
    );

    // Register all tool modules
    registerToolsFromModule(authTools);
    registerToolsFromModule(catalogTools);
    registerToolsFromModule(inventoryTools);
    registerToolsFromModule(ordersTools);
    registerToolsFromModule(reportsTools);
    registerToolsFromModule(feedsTools);
    registerToolsFromModule(financeTools);
    registerToolsFromModule(notificationsTools);
    registerToolsFromModule(sellerTools);
    registerToolsFromModule(fbaTools);
    registerToolsFromModule(productPricingTools);
    registerToolsFromModule(listingsTools);

    export { server };
