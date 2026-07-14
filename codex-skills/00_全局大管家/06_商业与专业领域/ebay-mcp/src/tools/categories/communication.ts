import { z } from 'zod';
import { rawTool } from '@/tools/define-tool.js';
import type { ToolEntry } from '@/tools/registry.js';
import {
  getAwaitingFeedbackSchema,
  getFeedbackRatingSummarySchema,
  getFeedbackSchema,
  leaveFeedbackForBuyerSchema,
  respondToFeedbackSchema,
} from '@/utils/communication/feedback.js';
import {
  bulkUpdateConversationSchema,
  getConversationSchema,
  getConversationsSchema,
  sendMessageSchema,
  updateConversationSchema,
} from '@/utils/communication/message.js';
import {
  findEligibleItemsSchema,
  getOffersToBuyersSchema,
  sendOfferToInterestedBuyersSchema,
} from '@/utils/communication/negotiation.js';
import {
  createDestinationSchema,
  createSubscriptionFilterSchema,
  createSubscriptionSchema,
  deleteDestinationSchema,
  deleteSubscriptionFilterSchema,
  deleteSubscriptionSchema,
  disableSubscriptionSchema,
  enableSubscriptionSchema,
  getConfigSchema,
  getDestinationSchema,
  getPublicKeySchema,
  getSubscriptionFilterSchema,
  getSubscriptionSchema,
  getSubscriptionsSchema,
  getTopicSchema,
  getTopicsSchema,
  testSubscriptionSchema,
  updateConfigSchema,
  updateDestinationSchema,
  updateSubscriptionSchema,
} from '@/utils/communication/notification.js';

/**
 * Communication API tools for member messages, notifications, and seller feedback.
 *
 * These tools use {@link rawTool} rather than `defineTool`: each handler validates
 * its arguments against a dedicated `@/utils/communication` schema (the real call
 * contract). The advertised input schema is taken from that same schema's `.shape`,
 * so MCP clients see exactly the fields the handler accepts — no re-parsing against
 * a divergent advertised schema, and no field-name drift between the two.
 */
export const communicationEntries: ToolEntry[] = [
  // Negotiation API
  rawTool({
    name: 'ebay_get_offers_to_buyers',
    description: 'Get offers to buyers (Best Offers) for the seller',
    inputSchema: getOffersToBuyersSchema.shape,
    handler: (api, args) => {
      const validated = getOffersToBuyersSchema.parse(args);
      return api.negotiation.getOffersToBuyers(
        validated.filter,
        validated.limit ? Number(validated.limit) : undefined,
        validated.offset ? Number(validated.offset) : undefined
      );
    },
  }),
  rawTool({
    name: 'ebay_send_offer_to_interested_buyers',
    description: 'Send offer to interested buyers',
    inputSchema: sendOfferToInterestedBuyersSchema.shape,
    handler: (api, args) => {
      const validated = sendOfferToInterestedBuyersSchema.parse(args);
      return api.negotiation.sendOfferToInterestedBuyers(validated);
    },
  }),
  // Message API
  rawTool({
    name: 'ebay_search_messages',
    description: 'Search for buyer-seller messages',
    inputSchema: getConversationsSchema.shape,
    handler: (api, args) => {
      const validated = getConversationsSchema.parse(args);
      return api.message.searchMessages(
        undefined,
        validated.limit ? Number(validated.limit) : undefined,
        validated.offset ? Number(validated.offset) : undefined
      );
    },
  }),
  rawTool({
    name: 'ebay_get_message',
    description: 'Get a specific message by ID',
    inputSchema: getConversationSchema.shape,
    handler: (api, args) => {
      const validated = getConversationSchema.parse(args);
      return api.message.getMessage(validated.conversation_id);
    },
  }),
  rawTool({
    name: 'ebay_send_message',
    description:
      'Send a direct message to a buyer regarding a specific transaction or inquiry. Use this to communicate about orders, answer questions, resolve issues, or provide updates. Provide message_text plus either conversation_id (to reply) or other_party_username (to start a new thread).',
    inputSchema: sendMessageSchema.shape,
    handler: (api, args) => {
      const validated = sendMessageSchema.parse(args);
      return api.message.sendMessage(validated);
    },
  }),
  rawTool({
    name: 'ebay_reply_to_message',
    description: 'Reply to a buyer message in an existing conversation thread',
    inputSchema: {
      messageId: z.string().describe('The conversation/message ID to reply to'),
      messageContent: z.string().describe('The reply message content'),
    },
    handler: (api, args) => {
      if (!args.messageId || !args.messageContent) {
        throw new Error('messageId and messageContent are required');
      }
      return api.message.replyToMessage(args.messageId, args.messageContent);
    },
  }),
  // Notification API
  rawTool({
    name: 'ebay_get_notification_config',
    description: 'Get notification configuration',
    inputSchema: {},
    handler: (api, args) => {
      getConfigSchema.parse(args);
      return api.notification.getConfig();
    },
  }),
  rawTool({
    name: 'ebay_update_notification_config',
    description: 'Update notification configuration',
    inputSchema: updateConfigSchema.shape,
    handler: (api, args) => {
      const validated = updateConfigSchema.parse(args);
      return api.notification.updateConfig(validated);
    },
  }),
  rawTool({
    name: 'ebay_get_notification_destinations',
    description: 'Get all notification destinations (paginated)',
    inputSchema: {
      limit: z
        .number()
        .optional()
        .describe('Maximum number of destinations to return (10-100, default: 20)'),
      continuationToken: z.string().optional().describe('Token to retrieve next page of results'),
    },
    handler: (api, args) => api.notification.getDestinations(args.limit, args.continuationToken),
  }),
  rawTool({
    name: 'ebay_create_notification_destination',
    description: 'Create a notification destination',
    inputSchema: createDestinationSchema.shape,
    handler: (api, args) => {
      const validated = createDestinationSchema.parse(args);
      return api.notification.createDestination(validated);
    },
  }),
  // Notification API - Destination CRUD
  rawTool({
    name: 'ebay_get_notification_destination',
    description: 'Get a specific notification destination by ID',
    inputSchema: {
      destination_id: z.string().describe('The unique identifier for the destination'),
    },
    handler: (api, args) => {
      const validated = getDestinationSchema.parse(args);
      return api.notification.getDestination(validated.destination_id);
    },
  }),
  rawTool({
    name: 'ebay_update_notification_destination',
    description: 'Update a notification destination',
    inputSchema: {
      destination_id: z.string().describe('The unique identifier for the destination'),
      delivery_config: z
        .object({
          endpoint: z.string().optional().describe('HTTPS endpoint URL'),
          verification_token: z
            .string()
            .optional()
            .describe('Verification token (32-80 characters)'),
        })
        .optional()
        .describe('Delivery configuration'),
      name: z.string().optional().describe('Destination name'),
      status: z.string().optional().describe('Status: ENABLED or DISABLED'),
    },
    handler: (api, args) => {
      const validated = updateDestinationSchema.parse(args);
      return api.notification.updateDestination(validated.destination_id, validated);
    },
  }),
  rawTool({
    name: 'ebay_delete_notification_destination',
    description: 'Delete a notification destination',
    inputSchema: {
      destination_id: z.string().describe('The unique identifier for the destination'),
    },
    handler: (api, args) => {
      const validated = deleteDestinationSchema.parse(args);
      return api.notification.deleteDestination(validated.destination_id);
    },
  }),
  // Notification API - Subscription CRUD
  rawTool({
    name: 'ebay_get_notification_subscriptions',
    description: 'Get all notification subscriptions (paginated)',
    inputSchema: {
      limit: z.string().optional().describe('Maximum number of subscriptions to return'),
      continuation_token: z.string().optional().describe('Token for pagination'),
    },
    handler: (api, args) => {
      const validated = getSubscriptionsSchema.parse(args);
      return api.notification.getSubscriptions(
        validated.limit ? Number(validated.limit) : undefined,
        validated.continuation_token
      );
    },
  }),
  rawTool({
    name: 'ebay_create_notification_subscription',
    description: 'Create a notification subscription',
    inputSchema: {
      destination_id: z.string().optional().describe('The destination endpoint ID'),
      payload: z
        .object({
          delivery_protocol: z.string().optional().describe('Delivery protocol (HTTPS)'),
          format: z.string().optional().describe('Payload format (JSON)'),
          schema_version: z.string().optional().describe('Schema version'),
        })
        .optional()
        .describe('Payload configuration'),
      status: z.string().optional().describe('Status: ENABLED or DISABLED'),
      topic_id: z.string().optional().describe('The notification topic ID'),
    },
    handler: (api, args) => {
      const validated = createSubscriptionSchema.parse(args);
      return api.notification.createSubscription(validated);
    },
  }),
  rawTool({
    name: 'ebay_get_notification_subscription',
    description: 'Get a specific notification subscription by ID',
    inputSchema: {
      subscription_id: z.string().describe('The unique identifier for the subscription'),
    },
    handler: (api, args) => {
      const validated = getSubscriptionSchema.parse(args);
      return api.notification.getSubscription(validated.subscription_id);
    },
  }),
  rawTool({
    name: 'ebay_update_notification_subscription',
    description: 'Update a notification subscription',
    inputSchema: {
      subscription_id: z.string().describe('The unique identifier for the subscription'),
      destination_id: z.string().optional().describe('The destination endpoint ID'),
      payload: z
        .object({
          delivery_protocol: z.string().optional().describe('Delivery protocol'),
          format: z.string().optional().describe('Payload format'),
          schema_version: z.string().optional().describe('Schema version'),
        })
        .optional()
        .describe('Payload configuration'),
      status: z.string().optional().describe('Status: ENABLED or DISABLED'),
    },
    handler: (api, args) => {
      const validated = updateSubscriptionSchema.parse(args);
      return api.notification.updateSubscription(validated.subscription_id, validated);
    },
  }),
  rawTool({
    name: 'ebay_delete_notification_subscription',
    description: 'Delete a notification subscription',
    inputSchema: {
      subscription_id: z.string().describe('The unique identifier for the subscription'),
    },
    handler: (api, args) => {
      const validated = deleteSubscriptionSchema.parse(args);
      return api.notification.deleteSubscription(validated.subscription_id);
    },
  }),
  rawTool({
    name: 'ebay_disable_notification_subscription',
    description: 'Disable a notification subscription',
    inputSchema: {
      subscription_id: z.string().describe('The unique identifier for the subscription'),
    },
    handler: (api, args) => {
      const validated = disableSubscriptionSchema.parse(args);
      return api.notification.disableSubscription(validated.subscription_id);
    },
  }),
  rawTool({
    name: 'ebay_enable_notification_subscription',
    description: 'Enable a notification subscription',
    inputSchema: {
      subscription_id: z.string().describe('The unique identifier for the subscription'),
    },
    handler: (api, args) => {
      const validated = enableSubscriptionSchema.parse(args);
      return api.notification.enableSubscription(validated.subscription_id);
    },
  }),
  rawTool({
    name: 'ebay_test_notification_subscription',
    description: 'Test a notification subscription by sending a test message',
    inputSchema: {
      subscription_id: z.string().describe('The unique identifier for the subscription'),
    },
    handler: (api, args) => {
      const validated = testSubscriptionSchema.parse(args);
      return api.notification.testSubscription(validated.subscription_id);
    },
  }),
  // Notification API - Subscription Filters
  rawTool({
    name: 'ebay_create_notification_subscription_filter',
    description: 'Create a filter for a notification subscription',
    inputSchema: {
      subscription_id: z.string().describe('The unique identifier for the subscription'),
      filter_schema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON Schema document to filter notifications'),
    },
    handler: (api, args) => {
      const validated = createSubscriptionFilterSchema.parse(args);
      return api.notification.createSubscriptionFilter(validated.subscription_id, validated);
    },
  }),
  rawTool({
    name: 'ebay_get_notification_subscription_filter',
    description: 'Get a specific subscription filter',
    inputSchema: {
      subscription_id: z.string().describe('The unique identifier for the subscription'),
      filter_id: z.string().describe('The unique identifier for the filter'),
    },
    handler: (api, args) => {
      const validated = getSubscriptionFilterSchema.parse(args);
      return api.notification.getSubscriptionFilter(validated.subscription_id, validated.filter_id);
    },
  }),
  rawTool({
    name: 'ebay_delete_notification_subscription_filter',
    description: 'Delete a subscription filter',
    inputSchema: {
      subscription_id: z.string().describe('The unique identifier for the subscription'),
      filter_id: z.string().describe('The unique identifier for the filter'),
    },
    handler: (api, args) => {
      const validated = deleteSubscriptionFilterSchema.parse(args);
      return api.notification.deleteSubscriptionFilter(
        validated.subscription_id,
        validated.filter_id
      );
    },
  }),
  // Notification API - Topics
  rawTool({
    name: 'ebay_get_notification_topic',
    description: 'Get a specific notification topic by ID',
    inputSchema: {
      topic_id: z.string().describe('The unique identifier for the topic'),
    },
    handler: (api, args) => {
      const validated = getTopicSchema.parse(args);
      return api.notification.getTopic(validated.topic_id);
    },
  }),
  rawTool({
    name: 'ebay_get_notification_topics',
    description: 'Get all available notification topics (paginated)',
    inputSchema: {
      limit: z.string().optional().describe('Maximum number of topics to return'),
      continuation_token: z.string().optional().describe('Token for pagination'),
    },
    handler: (api, args) => {
      const validated = getTopicsSchema.parse(args);
      return api.notification.getTopics(
        validated.limit ? Number(validated.limit) : undefined,
        validated.continuation_token
      );
    },
  }),
  // Notification API - Public Key
  rawTool({
    name: 'ebay_get_notification_public_key',
    description: 'Get a public key for verifying notification signatures',
    inputSchema: {
      public_key_id: z.string().describe('The unique identifier for the public key'),
    },
    handler: (api, args) => {
      const validated = getPublicKeySchema.parse(args);
      return api.notification.getPublicKey(validated.public_key_id);
    },
  }),
  // Message API - Conversations
  rawTool({
    name: 'ebay_get_conversations',
    description: 'Get all buyer-seller conversations (paginated)',
    inputSchema: getConversationsSchema.shape,
    handler: (api, args) => {
      const validated = getConversationsSchema.parse(args);
      return api.message.getConversations(
        undefined,
        validated.limit ? Number(validated.limit) : undefined,
        validated.offset ? Number(validated.offset) : undefined
      );
    },
  }),
  rawTool({
    name: 'ebay_get_conversation',
    description: 'Get a specific conversation by ID',
    inputSchema: getConversationSchema.shape,
    handler: (api, args) => {
      const validated = getConversationSchema.parse(args);
      return api.message.getConversation(validated.conversation_id);
    },
  }),
  rawTool({
    name: 'ebay_bulk_update_conversation',
    description:
      'Bulk update multiple conversations. Each entry sets conversation_status (ACTIVE, ARCHIVE, DELETE, READ, UNREAD) for a conversation_id.',
    inputSchema: bulkUpdateConversationSchema.shape,
    handler: (api, args) => {
      const validated = bulkUpdateConversationSchema.parse(args);
      return api.message.bulkUpdateConversation(validated);
    },
  }),
  rawTool({
    name: 'ebay_update_conversation',
    description:
      'Update a single conversation (conversation_status: ACTIVE, ARCHIVE, DELETE; or read flag).',
    inputSchema: updateConversationSchema.shape,
    handler: (api, args) => {
      const validated = updateConversationSchema.parse(args);
      return api.message.updateConversation(validated);
    },
  }),
  // Feedback API
  rawTool({
    name: 'ebay_get_feedback',
    description: 'Get feedback for a user by type',
    inputSchema: {
      user_id: z.string().describe('The eBay username of the user'),
      feedback_type: z.string().describe('Type: FEEDBACK_RECEIVED or FEEDBACK_SENT'),
      feedback_id: z.string().optional().describe('Filter by specific feedback ID'),
      filter: z.string().optional().describe('Filter criteria'),
      limit: z.string().optional().describe('Maximum number of feedback items to return'),
      listing_id: z.string().optional().describe('Filter by listing ID'),
      offset: z.string().optional().describe('Number of items to skip'),
      order_line_item_id: z.string().optional().describe('Filter by order line item ID'),
      sort: z.string().optional().describe('Sort order'),
      transaction_id: z.string().optional().describe('Filter by transaction ID'),
    },
    handler: (api, args) => {
      const validated = getFeedbackSchema.parse(args);
      return api.feedback.getFeedback(validated.transaction_id ?? '');
    },
  }),
  rawTool({
    name: 'ebay_leave_feedback_for_buyer',
    description:
      'Leave feedback for a buyer. Provide order_line_item_id, comment_type (POSITIVE/NEUTRAL/NEGATIVE), and comment_text.',
    inputSchema: leaveFeedbackForBuyerSchema.shape,
    handler: (api, args) => {
      const validated = leaveFeedbackForBuyerSchema.parse(args);
      return api.feedback.leaveFeedbackForBuyer(validated);
    },
  }),
  rawTool({
    name: 'ebay_get_feedback_summary',
    description: 'Get feedback summary for the seller',
    inputSchema: {},
    outputSchema: {
      type: 'object',
      properties: {},
      description: 'Success response',
    },
    handler: (api) => api.feedback.getFeedbackSummary(),
  }),
  rawTool({
    name: 'ebay_get_awaiting_feedback',
    description: 'Get transactions awaiting feedback from the seller',
    inputSchema: {
      filter: z.string().optional().describe('Filter criteria'),
      limit: z.string().optional().describe('Maximum number of items to return (25-200)'),
      offset: z.string().optional().describe('Number of items to skip'),
      sort: z.string().optional().describe('Sort order'),
    },
    handler: (api, args) => {
      const validated = getAwaitingFeedbackSchema.parse(args);
      return api.feedback.getAwaitingFeedback(
        validated.filter,
        validated.limit ? Number(validated.limit) : undefined,
        validated.offset ? Number(validated.offset) : undefined
      );
    },
  }),
  rawTool({
    name: 'ebay_respond_to_feedback',
    description: 'Respond to feedback received from a buyer',
    inputSchema: {
      feedback_id: z.string().optional().describe('The feedback ID being responded to'),
      recipient_user_id: z.string().optional().describe('The user ID of the feedback provider'),
      response_text: z
        .string()
        .optional()
        .describe('The response text content (max 500 characters)'),
      response_type: z.string().optional().describe('The response type: REPLY or FOLLOW_UP'),
    },
    handler: (api, args) => {
      const validated = respondToFeedbackSchema.parse(args);
      return api.feedback.respondToFeedback(
        validated.feedback_id ?? '',
        validated.response_text ?? ''
      );
    },
  }),
  rawTool({
    name: 'ebay_get_feedback_rating_summary',
    description: 'Get feedback rating summary for a user',
    inputSchema: {
      user_id: z.string().describe('The eBay username of the user'),
      filter: z.string().describe('Filter with required ratingType parameter'),
    },
    handler: (api, args) => {
      getFeedbackRatingSummarySchema.parse(args);
      return api.feedback.getFeedbackRatingSummary();
    },
  }),
];

/**
 * Handler-only negotiation tool.
 *
 * `ebay_find_eligible_items` has a handler but no registered definition (matching
 * prior behavior, where it was absent from the definitions catalog). It is exposed
 * via `handlerOnlyEntries` so it remains callable through `executeTool` without
 * being advertised to MCP clients.
 */
export const communicationHandlerOnlyEntries: ToolEntry[] = [
  rawTool({
    name: 'ebay_find_eligible_items',
    description: 'Find items eligible for Send Offer to Buyers',
    inputSchema: {
      marketplace_id: z
        .string()
        .optional()
        .describe('The eBay marketplace ID (X-EBAY-C-MARKETPLACE-ID header)'),
      limit: z.string().optional().describe('Maximum number of items to return (1-200)'),
      offset: z.string().optional().describe('Number of items to skip'),
    },
    handler: (api, args) => {
      const validated = findEligibleItemsSchema.parse(args);
      return api.negotiation.findEligibleItems(
        validated.marketplace_id,
        validated.limit ? Number(validated.limit) : undefined,
        validated.offset ? Number(validated.offset) : undefined
      );
    },
  }),
];
