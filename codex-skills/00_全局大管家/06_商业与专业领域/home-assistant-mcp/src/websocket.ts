import * as hassWs from "home-assistant-js-websocket";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { EntityId } from "./types/common/types.js";
import type { State } from "./types/entity/core/types.js";
import type { MessageBase } from "./types/websocket/types.js";
import type { Filter, Details, Entity } from './types/websocket/subscription.types';
import type { HassEntity } from './types/entities/entity.types';

// Schema for validating outgoing messages
const MessageSchema = z.object({
  type: z.string(),
  id: z.number().optional(),
  payload: z.unknown().optional(),
});

// Constants for connection management
const CONNECTION_TIMEOUT = 30000; // 30 seconds
const RECONNECT_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds
const MAX_QUEUE_SIZE = 100; // Maximum number of queued messages

export class HassWebSocket {
  private connection: hassWs.Connection | null = null;
  private entityCache: Map<EntityId, State> = new Map();
  private previousEntityStates: Map<EntityId, State> = new Map(); // Track previous states
  private subscriptions: Map<string, Details> = new Map();
  private mcp: McpServer;
  private hassUrl: string;
  private hassToken: string;
  private useMock: boolean;
  private isConnected: boolean = false;
  private connectionPromise: Promise<hassWs.Connection> | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastEntityChanged: Date | null = null;
  private entityChangeCallbacks: Map<
    string,
    (entities: Entity[]) => void
  > = new Map();
  private connectionAttempts: number = 0;
  private messageQueue: Array<MessageBase> = [];
  private connectionTimeout: NodeJS.Timeout | null = null;
  private lastHeartbeatResponse: Date | null = null;
  private nextSubscriptionId = 1;

  constructor(
    mcp: McpServer,
    hassUrl: string,
    hassToken: string,
    useMock: boolean = false,
  ) {
    this.mcp = mcp;
    this.hassUrl = hassUrl;
    this.hassToken = hassToken;
    this.useMock = useMock;

    this.log("info", "HassWebSocket initialized");
  }

  /**
   * Enhanced logging with severity levels
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: unknown,
  ): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [HassWebSocket] ${message}`;

    switch (level) {
      case "debug":
        console.debug(formattedMessage, data);
        break;
      case "info":
        console.warn(formattedMessage, data);
        break;
      case "warn":
        console.warn(formattedMessage, data);
        break;
      case "error":
        console.error(formattedMessage, data);
        break;
    }
  }

  /**
   * Connect to Home Assistant WebSocket API with improved error handling and timeouts
   */
  async connect(): Promise<hassWs.Connection> {
    if (this.connection) {
      return this.connection;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const connectToHass = async () => {
        try {
          this.log(
            "info",
            `Connecting to Home Assistant WebSocket API at ${this.hassUrl}`,
          );
          this.connectionAttempts++;

          // Set connection timeout
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
          }
          this.connectionTimeout = setTimeout(() => {
            this.log(
              "error",
              `Connection timeout after ${CONNECTION_TIMEOUT}ms`,
            );
            reject(new Error("Connection timeout"));
            this.connectionPromise = null;
            this.setupReconnect();
          }, CONNECTION_TIMEOUT);

          // Create auth object for Home Assistant using createLongLivedTokenAuth instead of Auth constructor
          const auth = hassWs.createLongLivedTokenAuth(
            this.hassUrl,
            this.hassToken,
          );

          // Connect to WebSocket API
          const connection = await hassWs.createConnection({ auth });
          this.log("info", "Connected to Home Assistant WebSocket API");

          // Clear connection timeout
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          // Reset connection attempts on successful connection
          this.connectionAttempts = 0;

          // Store connection
          this.connection = connection;
          this.isConnected = true;
          this.lastHeartbeatResponse = new Date();

          // Handle connection events
          connection.addEventListener("ready", () => {
            this.log("info", "WebSocket connection ready");
            // Process any queued messages
            this.processQueuedMessages();
          });

          connection.addEventListener("disconnected", () => {
            this.log("warn", "WebSocket disconnected, will try to reconnect");
            this.isConnected = false;
            this.setupReconnect();
          });

          // Setup regular health checks
          this.setupHealthCheck();

          // Subscribe to all entities to maintain a cache
          hassWs.subscribeEntities(connection, (entities) => {
            // Check for expired subscriptions every time we get updates
            this.checkExpiredSubscriptions();

            // Store previous state before updating
            for (const [entityId, _entity] of Object.entries(entities)) {
              if (this.entityCache.has(entityId)) {
                this.previousEntityStates.set(
                  entityId,
                  this.entityCache.get(entityId) as State,
                );
              }
            }

            // Update entity cache
            for (const [entityId, entity] of Object.entries(entities)) {
              this.entityCache.set(entityId, entity);
            }

            // Check for changes that match subscriptions and trigger callbacks
            this.processEntityChanges(entities);

            // Mark as changed
            this.lastEntityChanged = new Date();
          });

          return connection;
        } catch (error) {
          this.log(
            "error",
            "Error connecting to Home Assistant WebSocket API:",
            error,
          );

          // Clear connection timeout if it exists
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          this.connectionPromise = null;
          this.isConnected = false;
          this.setupReconnect();
          throw error;
        }
      };

      connectToHass().then(resolve).catch(reject);
    });

    return this.connectionPromise;
  }

  /**
   * Setup health check to proactively monitor connection
   */
  private setupHealthCheck() {
    if (this.healthCheckInterval !== null) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      if (this.isConnected && this.connection) {
        try {
          // Ping the server to check connection health
          this.log("debug", "Sending health check ping");
          const result = await this.connection.sendMessagePromise({
            type: "ping",
          });
          this.lastHeartbeatResponse = new Date();
          this.log("debug", "Health check successful", result);
        } catch (error) {
          this.log(
            "warn",
            "Health check failed, connection may be unstable",
            error,
          );

          // If last heartbeat was too long ago, force reconnection
          if (this.lastHeartbeatResponse) {
            const timeSinceHeartbeat =
              Date.now() - this.lastHeartbeatResponse.getTime();
            if (timeSinceHeartbeat > HEALTH_CHECK_INTERVAL * 2) {
              this.log(
                "error",
                "Connection appears dead, forcing reconnection",
              );
              this.forceReconnect();
            }
          }
        }
      }
    }, HEALTH_CHECK_INTERVAL) as unknown as NodeJS.Timeout;
  }

  /**
   * Force a reconnection by closing and reopening the connection
   */
  private async forceReconnect() {
    this.log("info", "Forcing reconnection to Home Assistant");

    // Close existing connection
    if (this.connection) {
      try {
        this.connection.close();
      } catch (error) {
        this.log(
          "error",
          "Error while closing connection during force reconnect",
          error,
        );
      }
    }

    this.connection = null;
    this.isConnected = false;
    this.connectionPromise = null;

    // Attempt to reconnect
    try {
      await this.connect();

      // Resubscribe to all active subscriptions
      for (const [subId, subscription] of this.subscriptions.entries()) {
        await this.subscribeEntities(subscription.entityIds, subId);
      }
    } catch (error) {
      this.log("error", "Error during forced reconnection", error);
      this.setupReconnect();
    }
  }

  /**
   * Setup reconnection logic with exponential backoff
   */
  private setupReconnect() {
    if (this.reconnectInterval !== null) {
      clearInterval(this.reconnectInterval);
    }

    // Calculate backoff based on connection attempts (max 5 minutes)
    const backoff = Math.min(
      RECONNECT_INTERVAL * Math.pow(1.5, this.connectionAttempts - 1),
      300000,
    );

    this.log(
      "info",
      `Setting up reconnection attempt in ${backoff}ms (attempt #${this.connectionAttempts})`,
    );

    this.reconnectInterval = setInterval(async () => {
      if (!this.isConnected) {
        try {
          this.connectionPromise = null;
          this.connection = null;
          await this.connect();

          // Resubscribe to all active subscriptions
          for (const [subId, subscription] of this.subscriptions.entries()) {
            await this.subscribeEntities(subscription.entityIds, subId);
          }

          if (this.reconnectInterval !== null) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
        } catch (error) {
          this.log(
            "error",
            "Error reconnecting to Home Assistant WebSocket API:",
            error,
          );
        }
      } else {
        if (this.reconnectInterval !== null) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      }
    }, backoff) as unknown as NodeJS.Timeout;
  }

  /**
   * Queue a message to be sent when connection is available
   */
  private queueMessage(message: MessageBase): boolean {
    // Check if queue is full (backpressure handling)
    if (this.messageQueue.length >= MAX_QUEUE_SIZE) {
      this.log("error", "Message queue full, dropping message", message);
      return false;
    }

    try {
      // Validate message before queuing
      MessageSchema.parse(message);
      this.messageQueue.push(message);
      this.log(
        "debug",
        `Message queued, queue size: ${this.messageQueue.length}`,
      );
      return true;
    } catch (error) {
      this.log("error", "Invalid message format, not queuing:", error);
      return false;
    }
  }

  /**
   * Process queued messages when connection is available
   */
  private async processQueuedMessages() {
    if (
      !this.isConnected ||
      !this.connection ||
      this.messageQueue.length === 0
    ) {
      return;
    }

    this.log("info", `Processing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      try {
        await this.connection.sendMessagePromise(message as hassWs.MessageBase);
        this.log("debug", "Queued message sent successfully");
      } catch (error) {
        this.log("error", "Error sending queued message", error);
        // If connection failed, stop processing and requeue the message
        if (!this.isConnected) {
          this.messageQueue.unshift(message as hassWs.MessageBase);
          break;
        }
      }
    }
  }

  /**
   * Send a message with validation and queueing
   */
  async sendMessage(message: MessageBase): Promise<unknown> {
    try {
      // Validate message
      MessageSchema.parse(message);

      // If not connected, queue message for later
      if (!this.isConnected) {
        this.log("info", "Not connected, queueing message for later");
        const wasQueued = this.queueMessage(message);
        if (!wasQueued) {
          throw new Error("Failed to queue message: queue is full");
        }

        // Trigger connection attempt if not already connecting
        if (!this.connectionPromise) {
          this.log("info", "Triggering connection attempt for queued message");
          this.connect().catch((err) => {
            this.log("error", "Failed to connect for queued message", err);
          });
        }

        return { queued: true };
      }

      // Send message with timeout protection
      try {
        const connection = await this.connect();
        const result = await Promise.race([
          connection.sendMessagePromise(message),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Send message timeout after 10s")),
              10000,
            ),
          ),
        ]);

        this.log("debug", "Message sent successfully");
        return result;
      } catch (sendError) {
        // Check if connection is still active
        if (!this.isConnected) {
          this.log(
            "warn",
            "Connection lost while sending message, queueing for retry",
          );
          this.queueMessage(message);
          return { queued: true, error: "Connection lost during send" };
        }
        throw sendError;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.log("error", `Error sending message: ${errorMessage}`, error);

      // Include more diagnostic information in the error
      throw new Error(
        `Failed to send message: ${errorMessage}\nMessage type: ${message.type}`,
      );
    }
  }

  /**
   * Subscribe to entity changes with enhanced options
   */
  async subscribeEntities(
    entityIds: EntityId[],
    subscriptionId: string,
    filter?: Filter,
    expiresIn?: number,
    callbackId?: string,
  ): Promise<string> {
    try {
      // Validate inputs
      if (!entityIds || entityIds.length === 0) {
        throw new Error("Entity IDs must be provided");
      }

      if (!subscriptionId) {
        throw new Error("Subscription ID must be provided");
      }

      // If we already have a subscription with this ID, unsubscribe it first
      if (this.subscriptions.has(subscriptionId)) {
        this.unsubscribeEntities(subscriptionId);
      }

      // Connect to WebSocket if not already connected
      const connection = await this.connect();

      // Create subscription for these entities
      const unsub = hassWs.subscribeEntities(connection, () => {
        // We handle the actual subscription logic in the global entity subscription handler
      });

      // Calculate expiration date if provided
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : undefined;

      // Store subscription with enhanced options
      const subscription: Details = {
        unsubscribe: unsub,
        entityIds: entityIds,
        filter,
        filters: filter, // For backward compatibility
        lastChecked: new Date(),
        expiresAt,
        callbackId,
        callback: () => {}, // Required by type but not used in this context
      };
      this.subscriptions.set(subscriptionId, subscription);

      // Log subscription creation
      this.log(
        "info",
        `Created subscription ${subscriptionId} for ${entityIds.length} entities`,
        {
          entityIds,
          filter,
          expiresAt,
          callbackId,
        },
      );

      // Build response message
      let responseMsg = `Successfully subscribed to ${entityIds.length} entities with ID: ${subscriptionId}`;

      if (filter) {
        const filterDetails = [];
        if (filter.stateChange) filterDetails.push("state changes only");
        if (filter.attributeChanges?.length)
          filterDetails.push(
            `attribute changes for: ${filter.attributeChanges.join(", ")}`,
          );
        if (filter.minStateChangeAge)
          filterDetails.push(
            `min change age: ${filter.minStateChangeAge / 1000}s`,
          );

        if (filterDetails.length > 0) {
          responseMsg += ` (filtering by ${filterDetails.join(", ")})`;
        }
      }

      if (expiresAt) {
        responseMsg += `, expires at ${expiresAt.toISOString()}`;
      }

      if (callbackId) {
        responseMsg += `, with real-time notifications`;
      }

      return responseMsg;
    } catch (error) {
      this.log("error", "Failed to subscribe to entities:", error);
      throw new Error(
        `Failed to subscribe to entities: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Unsubscribe from entity changes
   */
  unsubscribeEntities(subscriptionId: string): string {
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      try {
        if (subscription.unsubscribe) {
          subscription.unsubscribe();
        }
        this.subscriptions.delete(subscriptionId);
        this.log("info", `Unsubscribed from subscription: ${subscriptionId}`);
        return `Successfully unsubscribed from subscription: ${subscriptionId}`;
      } catch (error) {
        this.log("error", `Error unsubscribing from ${subscriptionId}:`, error);
        // Still remove from our map even if there was an error
        this.subscriptions.delete(subscriptionId);
        return `Error unsubscribing from ${subscriptionId}, removed from tracking.`;
      }
    } else {
      return `No subscription found with ID: ${subscriptionId}`;
    }
  }

  /**
   * Get recent entity changes with filtering options
   */
  getRecentChanges(
    subscriptionId?: string,
    entityIds?: EntityId[],
    includeUnchanged: boolean = false,
  ): Entity[] {
    // If no changes since last check or no cache
    if (
      (!this.lastEntityChanged && !includeUnchanged) ||
      this.entityCache.size === 0
    ) {
      return [];
    }

    let entitiesToReturn: State[] = [];

    // If subscription ID is provided, use that subscription's entity list
    if (subscriptionId) {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        return [];
      }

      // Mark this subscription as checked
      subscription.lastChecked = new Date();

      // Get the entities for this subscription
      entitiesToReturn = subscription.entityIds
        .map((id) => this.entityCache.get(id))
        .filter((entity): entity is State => entity !== undefined);
    }
    // If entity IDs provided, filter by those
    else if (entityIds && entityIds.length > 0) {
      entitiesToReturn = entityIds
        .map((id) => this.entityCache.get(id))
        .filter((entity): entity is State => entity !== undefined);
    }
    // Otherwise return all entities
    else {
      entitiesToReturn = Array.from(this.entityCache.values());
    }

    // Convert to simplified entities
    const entities = entitiesToReturn.map((entity) => {
      // Get previous state to check for changes
      const prevEntity = this.previousEntityStates.get(entity.entity_id);

      // Identify which attributes changed
      const changedAttributes: string[] = [];
      if (prevEntity) {
        for (const [attr, value] of Object.entries(entity.attributes)) {
          if (value !== prevEntity.attributes[attr]) {
            changedAttributes.push(attr);
          }
        }
      }

      // Convert entity to plain object that can be stringified
      const result: Entity = {
        entity_id: entity.entity_id,
        state: entity.state,
        attributes: entity.attributes,
        last_changed: entity.last_changed,
        last_updated: entity.last_updated,
        context: entity.context,
        changed_attributes:
          changedAttributes.length > 0 ? changedAttributes : undefined,
      };
      return result;
    });

    // Skip clearing lastEntityChanged if we're including unchanged entities
    if (!includeUnchanged) {
      // Reset last changed timestamp only if we're not doing an includeUnchanged query
      this.lastEntityChanged = null;
    }

    this.log(
      "debug",
      `Returning ${entities.length} entities for change request`,
    );
    return entities;
  }

  /**
   * Close the WebSocket connection and clean up all resources
   */
  async close(): Promise<void> {
    this.log("info", "Closing WebSocket connection and cleaning up resources");

    // Set connected state to false immediately to prevent new operations
    this.isConnected = false;

    // Create a cleanup promise that will resolve when all resources are cleaned up
    return new Promise<void>((resolve) => {
      const cleanupTimeout = setTimeout(() => {
        this.log("warn", "Force cleanup after timeout");
        this.finalizeCleanup();
        resolve();
      }, 5000);

      try {
        if (this.connection) {
          // Unsubscribe from all subscriptions with timeout protection
          const unsubscribePromises: Promise<void>[] = [];

          for (const [subId] of this.subscriptions.entries()) {
            unsubscribePromises.push(
              Promise.race([
                new Promise<void>((resolveUnsub) => {
                  try {
                    this.unsubscribeEntities(subId);
                    resolveUnsub();
                  } catch (e) {
                    this.log("error", `Error unsubscribing from ${subId}:`, e);
                    resolveUnsub();
                  }
                }),
                new Promise<void>((resolveTimeout) =>
                  setTimeout(() => {
                    this.log("warn", `Unsubscribe timeout for ${subId}`);
                    resolveTimeout();
                  }, 1000),
                ),
              ]),
            );
          }

          // Wait for all unsubscribes to complete (or timeout)
          Promise.all(unsubscribePromises)
            .then(() => {
              this.log("info", "All subscriptions cleaned up");

              // Close the connection gracefully
              try {
                this.connection?.close();
              } catch (error) {
                this.log("error", "Error closing WebSocket connection:", error);
              }

              this.finalizeCleanup();
              clearTimeout(cleanupTimeout);
              resolve();
            })
            .catch((error) => {
              this.log("error", "Error during subscription cleanup:", error);
              this.finalizeCleanup();
              clearTimeout(cleanupTimeout);
              resolve();
            });
        } else {
          // No active connection to close
          this.finalizeCleanup();
          clearTimeout(cleanupTimeout);
          resolve();
        }
      } catch (error) {
        this.log("error", "Unexpected error during close:", error);
        this.finalizeCleanup();
        clearTimeout(cleanupTimeout);
        resolve();
      }
    });
  }

  /**
   * Final cleanup of all resources
   */
  private finalizeCleanup(): void {
    // Reset connection objects
    this.connection = null;
    this.isConnected = false;
    this.connectionPromise = null;

    // Clear all intervals and timeouts
    if (this.reconnectInterval !== null) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.healthCheckInterval !== null) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.connectionTimeout !== null) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Clear all data structures
    this.subscriptions.clear();
    this.messageQueue = [];
    this.connectionAttempts = 0;
    this.entityChangeCallbacks.clear();

    // Note: We're keeping the entity cache intact in case it's needed for reference

    this.log("info", "WebSocket resources successfully cleaned up");
  }

  /**
   * Check for and remove expired subscriptions
   */
  private checkExpiredSubscriptions() {
    const now = new Date();
    for (const [subId, subscription] of this.subscriptions.entries()) {
      if (subscription.expiresAt && now > subscription.expiresAt) {
        this.log("info", `Subscription ${subId} expired, removing`);
        this.unsubscribeEntities(subId);
      }
    }
  }

  /**
   * Process entity changes and trigger callbacks
   */
  private processEntityChanges(entities: Record<string, State>) {
    // Group entities by subscription
    const subscriptionChanges: Map<string, Entity[]> = new Map();
    const callbackChanges: Map<string, Entity[]> = new Map();

    // Track changed entities for cache invalidation
    const changedEntityIds: string[] = [];

    // Process each subscription
    for (const [subId, subscription] of this.subscriptions.entries()) {
      const changedEntities: Entity[] = [];

      // Check each entity in the subscription
      for (const entityId of subscription.entityIds) {
        const entity = entities[entityId];
        if (!entity) continue;

        const prevEntity = this.previousEntityStates.get(entityId);

        // Skip if no previous state (first update)
        if (!prevEntity) continue;

        let shouldInclude = false;
        const changedAttributes: string[] = [];

        // Check if state changed and if we should filter on that
        const stateChanged = entity.state !== prevEntity.state;

        // Track changed entities for cache invalidation
        if (stateChanged || this.hasAttributeChanges(entity, prevEntity)) {
          if (!changedEntityIds.includes(entityId)) {
            changedEntityIds.push(entityId);
          }
        }

        // If filter specifies stateChange and state didn't change, skip
        if (subscription.filters?.stateChange === true && !stateChanged) {
          continue;
        }

        if (stateChanged) {
          shouldInclude = true;
        }

        // Check for attribute changes if we have attribute filters
        if (subscription.filters?.attributeChanges) {
          for (const attr of subscription.filters.attributeChanges) {
            // If attribute exists and is different from previous
            if (entity.attributes[attr] !== prevEntity.attributes[attr]) {
              shouldInclude = true;
              changedAttributes.push(attr);
            }
          }

          // If we have attribute filters but none matched, skip
          if (
            subscription.filters.attributeChanges.length > 0 &&
            changedAttributes.length === 0
          ) {
            shouldInclude = false;
          }
        }

        // Check for minimum state change age
        if (shouldInclude && subscription.filters?.minStateChangeAge) {
          const lastUpdated = new Date(entity.last_updated);
          const timeSinceChange = Date.now() - lastUpdated.getTime();

          if (timeSinceChange < subscription.filters.minStateChangeAge) {
            shouldInclude = false;
          }
        }

        if (shouldInclude) {
          // Create a simplified entity with changed attributes info
          const simplifiedEntity: Entity = {
            entity_id: entity.entity_id,
            state: entity.state,
            attributes: entity.attributes,
            last_changed: entity.last_changed,
            last_updated: entity.last_updated,
            context: entity.context,
            changed_attributes:
              changedAttributes.length > 0 ? changedAttributes : undefined,
          };

          changedEntities.push(simplifiedEntity);
        }
      }

      if (changedEntities.length > 0) {
        // Update last checked time
        subscription.lastChecked = new Date();

        // Add to subscription changes for later retrieval
        subscriptionChanges.set(subId, changedEntities);

        // If this subscription has a callback ID, add to callback changes
        if (
          subscription.callbackId &&
          this.entityChangeCallbacks.has(subscription.callbackId)
        ) {
          if (!callbackChanges.has(subscription.callbackId)) {
            callbackChanges.set(subscription.callbackId, []);
          }
          callbackChanges
            .get(subscription.callbackId)!
            .push(...changedEntities);
        }
      }
    }

    // Trigger callbacks
    for (const [callbackId, entities] of callbackChanges.entries()) {
      const callback = this.entityChangeCallbacks.get(callbackId);
      if (callback) {
        try {
          callback(entities);
          this.log(
            "debug",
            `Triggered callback ${callbackId} with ${entities.length} entities`,
          );
        } catch (error) {
          this.log("error", `Error in callback ${callbackId}:`, error);
        }
      }
    }

    // Invalidate cache for changed entities
    this.invalidateCacheForEntities(changedEntityIds);
  }

  /**
   * Check if any attributes have changed between two entity states
   */
  private hasAttributeChanges(
    newEntity: State,
    prevEntity: State,
  ): boolean {
    const newAttrs = newEntity.attributes || {};
    const prevAttrs = prevEntity.attributes || {};

    // Simple check: different number of attributes
    if (Object.keys(newAttrs).length !== Object.keys(prevAttrs).length) {
      return true;
    }

    // Check each attribute
    for (const [key, value] of Object.entries(newAttrs)) {
      if (JSON.stringify(value) !== JSON.stringify(prevAttrs[key])) {
        return true;
      }
    }

    return false;
  }

  /**
   * Invalidate cache for changed entities
   */
  private invalidateCacheForEntities(entityIds: string[]): void {
    if (entityIds.length === 0) return;

    this.log(
      "info",
      `Invalidating cache for ${entityIds.length} changed entities`,
    );

    // Invalidate individual entity caches
    // for (const entityId of entityIds) {
    //   apiCache.handleEntityUpdate(entityId);
    // }

    // If too many entities changed, consider invalidating all states
    // if (entityIds.length > 10) {
    //   this.log("info", "Many entities changed, invalidating all states");
    //   apiCache.invalidate("/states");
    // }
  }

  /**
   * Subscribe to entity changes with a callback
   */
  subscribe(
    callback: (data: unknown) => void,
    filter?: Filter
  ): string {
    const id = String(this.nextSubscriptionId++);
    const subscription: Details = {
      callback,
      filter,
      filters: filter,
      entityIds: [], // Empty array since we're not filtering by entities
      lastChecked: new Date(),
    };
    this.subscriptions.set(id, subscription);
    return id;
  }

  /**
   * Handle an entity change event
   */
  handleEvent(event: { data: HassEntity }): void {
    for (const subscription of this.subscriptions.values()) {
      if (this.matchesFilter(event.data, subscription.filter || subscription.filters)) {
        subscription.callback(event.data);
      }
    }
  }

  private matchesFilter(
    entity: HassEntity,
    filter?: Filter
  ): boolean {
    if (!filter) return true;

    // Check state change filter
    if (filter.stateChange) {
      const prevEntity = this.previousEntityStates.get(entity.entity_id);
      if (!prevEntity || prevEntity.state === entity.state) {
        return false;
      }
    }

    // Check attribute changes filter
    if (filter.attributeChanges && filter.attributeChanges.length > 0) {
      const prevEntity = this.previousEntityStates.get(entity.entity_id);
      if (!prevEntity) return false;

      const hasAttributeChange = filter.attributeChanges.some(attr =>
        entity.attributes[attr] !== prevEntity.attributes[attr]
      );
      if (!hasAttributeChange) {
        return false;
      }
    }

    // Check minimum state change age
    if (filter.minStateChangeAge) {
      const lastUpdated = new Date(entity.last_updated || entity.last_changed || new Date());
      const timeSinceChange = Date.now() - lastUpdated.getTime();
      if (timeSinceChange < filter.minStateChangeAge) {
        return false;
      }
    }

    return true;
  }
}
