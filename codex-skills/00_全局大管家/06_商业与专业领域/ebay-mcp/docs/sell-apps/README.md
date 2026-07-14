# eBay API Spec Sources

Spec-URL manifest consumed by `npm run sync` (`src/scripts/dev-sync.ts`). The sync
tool extracts every `*_oas3.json` link listed below, downloads each OpenAPI spec
into `docs/`, regenerates TypeScript types, and reports endpoints that have no tool
yet. Keep example/illustrative URLs out of this file — the scraper treats every
JSON link it finds here as a real download target.

> **Scope:** This project covers eBay's **Sell** (plus shared Commerce and Developer)
> APIs only — see the package description. The Buying Apps specs are intentionally
> excluded so the sync doesn't download out-of-scope APIs. Add them back here if Buy
> coverage is ever in scope.

---

## ⚙️ Application Settings and Insights

- **Analytics API**: [Overview](https://developer.ebay.com/api-docs/master/developer/analytics/openapi/3/developer_analytics_v1_beta_oas3.json)
- **Key Management API**: [Overview](https://developer.ebay.com/api-docs/master/developer/key-management/openapi/3/developer_key_management_v1_oas3.json)
- **Client Registration API**: [Overview](https://developer.ebay.com/api-docs/master/developer/client-registration/openapi/3/developer_client_registration_v1_oas3.json)

## 🚀 Selling Apps APIs

### Listing Management

- **Inventory API**: [Overview](https://developer.ebay.com/api-docs/master/sell/inventory/openapi/3/sell_inventory_v1_oas3.json)
- **Feed API**: [Overview](https://developer.ebay.com/api-docs/master/sell/feed/openapi/3/sell_feed_v1_oas3.json)
- **Media API**: [Overview](https://developer.ebay.com/api-docs/master/commerce/media/openapi/3/commerce_media_v1_beta_oas3.json)
- **Stores API**: [Overview](https://developer.ebay.com/api-docs/master/sell/stores/openapi/3/sell_stores_v1_oas3.json)

### Listing Metadata & Taxonomy

- **Metadata API**: [Overview](https://developer.ebay.com/api-docs/master/sell/metadata/openapi/3/sell_metadata_v1_oas3.json)
- **Taxonomy API**: [Overview](https://developer.ebay.com/api-docs/master/commerce/taxonomy/openapi/3/commerce_taxonomy_v1_oas3.json)
- **Charity API**: [Overview](https://developer.ebay.com/api-docs/master/commerce/charity/openapi/3/commerce_charity_v1_oas3.json)

### Account Management

- **Account API (v1)**: [Overview](https://developer.ebay.com/api-docs/master/sell/account/openapi/3/sell_account_v1_oas3.json)
- **Account API (v2)**: [Overview](https://developer.ebay.com/api-docs/master/sell/account/v2/openapi/3/sell_account_v2_oas3.json)
- **Finances API**: [Overview](https://developer.ebay.com/api-docs/master/sell/finances/openapi/3/sell_finances_v1_oas3.json)

### Communication & Negotiation

- **Message API**: [Overview](https://developer.ebay.com/api-docs/master/commerce/message/openapi/3/commerce_message_v1_oas3.json)
- **Notification API**: [Overview](https://developer.ebay.com/api-docs/master/commerce/notification/openapi/3/commerce_notification_v1_oas3.json)
- **Negotiation API**: [Overview](https://developer.ebay.com/api-docs/master/sell/negotiation/openapi/3/sell_negotiation_v1_oas3.json)
- **Feedback API**: [Overview](https://developer.ebay.com/api-docs/master/commerce/feedback/openapi/3/commerce_feedback_v1_beta_oas3.json)

### Order Management

- **Fulfillment API**: [Overview](https://developer.ebay.com/api-docs/master/sell/fulfillment/openapi/3/sell_fulfillment_v1_oas3.json)
- **Logistics API**: [Overview](https://developer.ebay.com/api-docs/master/sell/logistics/openapi/3/sell_logistics_v1_oas3.json)

### Marketing & Promotions

- **Marketing API**: [Overview](https://developer.ebay.com/api-docs/master/sell/marketing/openapi/3/sell_marketing_v1_oas3.json)
- **Recommendation API**: [Overview](https://developer.ebay.com/api-docs/master/sell/recommendation/openapi/3/sell_recommendation_v1_oas3.json)

### Analytics

- **Analytics API**: [Overview](https://developer.ebay.com/api-docs/master/sell/analytics/openapi/3/sell_analytics_v1_oas3.json)

### Other Selling APIs

- **Translation API**: [Overview](https://developer.ebay.com/api-docs/master/commerce/translation/openapi/3/commerce_translation_v1_beta_oas3.json)
- **Compliance API**: [Overview](https://developer.ebay.com/api-docs/master/sell/compliance/openapi/3/sell_compliance_v1_oas3.json)
- **Identity API**: [Overview](https://developer.ebay.com/api-docs/master/commerce/identity/openapi/3/commerce_identity_v1_oas3.json)
- **eDelivery International Shipping API**: [Overview](https://developer.ebay.com/api-docs/master/sell/edelivery_international_shipping/openapi/3/sell_edelivery_international_shipping_oas3.json)
- **Vero API**: [Overview](https://developer.ebay.com/api-docs/master/commerce/vero/openapi/3/commerce_vero_v1_oas3.json)
