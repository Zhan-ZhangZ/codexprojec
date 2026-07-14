export const apiDocs = {
      overview: `# Amazon Selling Partner API Overview

The Amazon Selling Partner API (SP-API) is a REST-based API that helps Amazon selling partners programmatically access their data on listings, orders, payments, reports, and more.

## Key Features

- Modern REST API with JSON payloads
- OAuth 2.0 authentication
- Role-based permissions
- Notifications for real-time updates
- Comprehensive documentation

## Main API Categories

- Catalog
- Feeds
- Finance
- FBA (Fulfillment by Amazon)
- Listings
- Notifications
- Orders
- Product Pricing
- Reports
- Sellers
- Tokens

For more information, visit the [Amazon SP-API documentation](https://developer-docs.amazon.com/sp-api/).`,

      authentication: `# Amazon SP-API Authentication

The SP-API uses OAuth 2.0 for authentication. The process involves:

1. Registering as a developer
2. Creating an application
3. Getting authorization from sellers
4. Using refresh tokens to get access tokens
5. Signing requests with AWS Signature Version 4

## Required Credentials

- Client ID and Client Secret
- Refresh Token
- AWS Access Key and Secret Key
- Role ARN (Amazon Resource Name)

## Access Token Flow

1. Use refresh token to get a temporary access token
2. Access token is valid for 1 hour
3. Include access token in the x-amz-access-token header

## AWS Signature

All requests must be signed with AWS Signature Version 4, which requires:
- AWS Access Key ID
- AWS Secret Access Key
- Target AWS region
- Current timestamp
- Request details (method, path, headers, body)`,

      catalog: `# Catalog API

The Catalog API lets you get information about items in the Amazon catalog.

## Key Endpoints

- GET /catalog/2022-04-01/items/{asin} - Get details for a specific item
- GET /catalog/2022-04-01/items - Search for items in the catalog

## Common Use Cases

- Get product details like title, brand, dimensions
- Search for products by keywords
- Get product images and descriptions
- Check product categories and classification

## Response Data

Catalog responses include:
- Basic product information
- Images and descriptions
- Product dimensions and weight
- Category information
- Related products`,

      orders: `# Orders API

The Orders API lets you retrieve order information for customer purchases.

## Key Endpoints

- GET /orders/v0/orders - Get orders based on criteria
- GET /orders/v0/orders/{orderId} - Get details for a specific order
- GET /orders/v0/orders/{orderId}/orderItems - Get items for a specific order

## Common Use Cases

- Retrieve new orders for fulfillment
- Get shipping addresses for orders
- Access order item details
- Track order status changes

## Order Statuses

- Pending
- Unshipped
- PartiallyShipped
- Shipped
- Canceled
- Unfulfillable

## Order Data

Order responses include:
- Order ID and purchase date
- Order status and fulfillment channel
- Shipping address and service level
- Payment information
- Item details (ASIN, SKU, quantity, price)`,

      reports: `# Reports API

The Reports API lets you create and retrieve reports about your seller account.

## Key Endpoints

- POST /reports/2021-06-30/reports - Create a report request
- GET /reports/2021-06-30/reports/{reportId} - Get report details
- GET /reports/2021-06-30/documents/{reportDocumentId} - Get report document

## Common Report Types

- GET_FLAT_FILE_OPEN_LISTINGS_DATA - Active listings
- GET_MERCHANT_LISTINGS_ALL_DATA - All listings with detailed information
- GET_FBA_INVENTORY_AGED_DATA - FBA inventory age
- GET_AMAZON_FULFILLED_SHIPMENTS_DATA - Orders fulfilled by Amazon
- GET_FLAT_FILE_ORDERS_DATA - Order information
- GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA - Estimated FBA fees

## Report Process

1. Create a report request
2. Check report processing status
3. Get report document ID when complete
4. Download report document`,

      feeds: `# Feeds API

The Feeds API lets you submit data to Amazon to update your catalog, inventory, prices, and more.

## Key Endpoints

- POST /feeds/2021-06-30/feeds - Create a feed
- GET /feeds/2021-06-30/feeds/{feedId} - Get feed details
- POST /feeds/2021-06-30/documents - Create a feed document
- GET /feeds/2021-06-30/documents/{feedDocumentId} - Get feed document

## Common Feed Types

- POST_INVENTORY_AVAILABILITY_DATA - Update inventory
- POST_PRODUCT_PRICING_DATA - Update prices
- POST_ORDER_FULFILLMENT_DATA - Confirm shipments
- POST_FLAT_FILE_LISTINGS_DATA - Update listings

## Feed Process

1. Create a feed document
2. Upload data to the presigned URL
3. Create a feed with the document ID
4. Check feed processing status
5. Get processing report when complete`,

      finance: `# Finance API

The Finance API provides financial information about your Amazon seller account.

## Key Endpoints

- GET /finances/v0/financialEventGroups - List financial event groups
- GET /finances/v0/financialEventGroups/{eventGroupId}/financialEvents - Get financial events for a group
- GET /finances/v0/financialEvents - List financial events

## Financial Event Types

- Order charges
- Refunds
- Service fees
- Adjustments
- FBA inventory fees
- Promotions
- Marketplace withdrawals

## Response Data

Finance responses include:
- Transaction amounts and types
- Order information
- Fee breakdowns
- Settlement information
- Tax details`,

      notifications: `# Notifications API

The Notifications API lets you subscribe to notifications about events in your seller account.

## Key Endpoints

- GET /notifications/v1/destinations - List notification destinations
- POST /notifications/v1/destinations - Create a notification destination
- GET /notifications/v1/subscriptions/{notificationType} - Get subscription
- POST /notifications/v1/subscriptions/{notificationType} - Create subscription

## Common Notification Types

- ANY_OFFER_CHANGED - Price and shipping offers changed
- FEED_PROCESSING_FINISHED - Feed processing completed
- ORDER_CHANGE - Order details changed
- REPORT_PROCESSING_FINISHED - Report processing completed

## Destination Types

- SQS - Amazon Simple Queue Service
- EventBridge - Amazon EventBridge

## Subscription Process

1. Create a destination (SQS or EventBridge)
2. Create subscriptions for notification types
3. Receive notifications at the destination`,

      productPricing: `# Product Pricing API

The Product Pricing API provides pricing information for Amazon products.

## Key Endpoints

- GET /products/pricing/v0/price - Get pricing information
- GET /products/pricing/v0/competitivePrice - Get competitive pricing
- GET /products/pricing/v0/listings/{sellerSKU}/offers - Get offers for a listing

## Common Use Cases

- Check your price competitiveness
- Monitor Buy Box eligibility
- Track competitor pricing
- Set optimal prices

## Response Data

Pricing responses include:
- Your price information
- Competitive price points
- Buy Box price and eligibility
- Lowest prices by condition
- Shipping prices and options`,

      listings: `# Listings API

The Listings API lets you create and manage your product listings on Amazon.

## Key Endpoints

- GET /listings/2021-08-01/items/{sellerId}/{sku} - Get listings item
- PUT /listings/2021-08-01/items/{sellerId}/{sku} - Create or update listings item
- DELETE /listings/2021-08-01/items/{sellerId}/{sku} - Delete listings item

## Common Use Cases

- Create new product listings
- Update product information
- Manage product variations
- Set product attributes

## Listing Data

Listings include:
- Product identifiers (SKU, UPC, EAN, etc.)
- Product details (title, description, bullet points)
- Images and media
- Pricing information
- Inventory information
- Shipping options`,

      fba: `# Fulfillment By Amazon (FBA) API

The FBA API lets you manage your FBA inventory and shipments.

## Key Endpoints

- GET /fba/inbound/v0/shipments - Get inbound shipments
- GET /fba/inventory/v1/summaries - Get inventory summaries
- GET /fba/inbound/v1/eligibility/inboundEligibility - Check inbound eligibility

## Common Use Cases

- Check inventory levels in Amazon fulfillment centers
- Create and track inbound shipments
- Check product eligibility for FBA
- Manage multi-channel fulfillment

## FBA Data

FBA responses include:
- Inventory levels by condition
- Shipment status and tracking
- Inventory health metrics
- Fulfillment center information
- Inbound shipment requirements`
    };
