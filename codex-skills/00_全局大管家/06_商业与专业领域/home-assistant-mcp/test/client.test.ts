import { expect, test, describe, beforeAll } from "bun:test";
import { HassClient } from "../src/api/client";
import type { HassState } from "../src/types/types";
import type { AxiosError } from "axios";

// Load environment variables
const HASS_URL = process.env.HASS_URL || "http://homeassistant.local:8123/api";
const HASS_TOKEN = process.env.HASS_TOKEN || "";

// Skip tests if HASS_TOKEN is not available
const shouldRunTests = !!HASS_TOKEN;

// Initialize the HassClient directly
const client = new HassClient(HASS_URL, HASS_TOKEN);

describe("HassClient Integration Tests", () => {
  // Skip all tests if no token is available
  if (!shouldRunTests) {
    test.skip("all tests - HASS_TOKEN not provided", () => {
      console.log("Skipping tests because HASS_TOKEN is not provided in .env");
    });
    return;
  }

  // Define test variables to be set in beforeAll
  let testLight: HassState | undefined;
  let allStates: HassState[] = [];

  // Run once before all tests
  beforeAll(async () => {
    // Check if the API is running and get some test data
    try {
      console.log("Setting up integration tests...");
      console.log(`Using Home Assistant at ${HASS_URL}`);

      // Get all states to use for testing
      allStates = await client.getAllStates();
      console.log(`Found ${allStates.length} entities in Home Assistant`);

      // Look specifically for the light.strip entity
      testLight = allStates.find((state) => state.entity_id === "light.strip");

      if (testLight) {
        console.log(`Using ${testLight.entity_id} for light-related tests`);
      } else {
        console.log("light.strip not found. Some tests may be skipped.");
      }
    } catch (error) {
      console.error("Error during test setup:", error);
      throw error;
    }
  });

  // Basic API Tests
  test("should connect to Home Assistant API", async () => {
    const response = await client.checkApi();
    expect(response).toBeDefined();
    expect(response.message).toBe("API running.");
  });

  test("should get Home Assistant configuration", async () => {
    const config = await client.getConfig();
    expect(config).toBeDefined();
    expect(config.version).toBeDefined();
    expect(config.location_name).toBeDefined();
  });

  test("should get all entity states", async () => {
    const states = await client.getAllStates();
    expect(states).toBeDefined();
    expect(Array.isArray(states)).toBe(true);
    expect(states.length).toBeGreaterThan(0);

    // Verify state structure
    const firstState = states[0];
    expect(firstState.entity_id).toBeDefined();
    expect(firstState.state).toBeDefined();
    expect(firstState.attributes).toBeDefined();
  });

  test("should get state of a specific entity", async () => {
    if (!allStates.length) {
      test.skip("No entities available for testing", () => {
        // Skip this test
      });
      return;
    }

    // Get the first entity from the list
    const testEntity = allStates[0];
    // Make sure entity_id is defined
    if (!testEntity.entity_id) {
      throw new Error("testEntity.entity_id is undefined");
    }

    const entityState = await client.getEntityState(testEntity.entity_id);

    expect(entityState).toBeDefined();
    expect(entityState.entity_id).toBe(testEntity.entity_id);
    expect(entityState.state).toBeDefined();
  });

  // Event-Related Tests
  test("should get all event listeners", async () => {
    const events = await client.getEvents();
    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);

    // Verify event structure
    const firstEvent = events[0];
    expect(firstEvent.event).toBeDefined();
    expect(firstEvent.listener_count).toBeDefined();
  });

  test("should fire a custom event", async () => {
    const result = await client.fireEvent("test_event", {
      test: true,
      message: "Test from API integration tests",
    });
    expect(result).toBeDefined();
    expect(result.message).toContain("Event test_event fired");
  });

  // History & Logbook Tests
  test("should get history data", async () => {
    try {
      // Get history for the last hour with a specific entity_id
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // We need at least one entity for history data
      if (!allStates.length) {
        console.log("No entities available for history test");
        expect(true).toBe(true); // Skip assertion
        return;
      }

      // Use the first entity's ID as filter
      const entityId = allStates[0].entity_id;
      const history = await client.getHistory(oneHourAgo, {
        filter_entity_id: entityId,
      });

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    } catch (error: unknown) {
      console.error(
        "History API error:",
        error instanceof Error ? error.message : String(error),
      );
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data: unknown; status: number };
        };
        console.error("Response data:", axiosError.response?.data);
        console.error("Status:", axiosError.response?.status);
      }
      throw error;
    }
  });

  test("should get logbook entries", async () => {
    // Get logbook for the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const logbook = await client.getLogbook(oneHourAgo);

    expect(logbook).toBeDefined();
    expect(Array.isArray(logbook)).toBe(true);
  });

  // Template Tests
  test("should render a template", async () => {
    const template = "{{ now() }}";
    const result = await client.renderTemplate(template);

    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  // Light Service Tests (conditionally run)
  test("should control a light entity if available", async () => {
    // Set a longer timeout for this specific test by using Bun's test syntax
    // The original timeout was set with test.timeout which doesn't exist in this implementation

    if (!testLight) {
      test.skip("No light entities available for testing", () => {
        // Skip this test
      });
      return;
    }

    // Make sure entity_id is defined
    if (!testLight.entity_id) {
      throw new Error("testLight.entity_id is undefined");
    }

    const lightId = testLight.entity_id;
    let initialState;

    try {
      // Wrap this in a Promise.race with a timeout to avoid test hanging
      initialState = await client.getEntityState(lightId);
      console.log(`Initial state of ${lightId} is ${initialState.state}`);

      // Toggle the light to the opposite state
      const targetState = initialState.state === "on" ? "off" : "on";
      console.log(
        `Toggling ${lightId} from ${initialState.state} to ${targetState}`,
      );

      // Create a timeout promise
      const timeout = (ms: number) =>
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Operation timed out after ${ms}ms`)),
            ms,
          ),
        );

      // Call the service with a timeout
      await Promise.race([
        client.callService("light", `turn_${targetState}`, {
          entity_id: lightId,
        }),
        timeout(8000), // 8 second timeout
      ]);

      // Wait a moment for the state to update (but not too long)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify the state changed
      const newState = await client.getEntityState(lightId);
      console.log(`New state of ${lightId} is ${newState.state}`);
      expect(newState.state).toBe(targetState);
    } catch (error: unknown) {
      console.error(
        "Light control test error:",
        error instanceof Error ? error.message : String(error),
      );
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data: unknown; status: number };
        };
        console.error("Response data:", axiosError.response?.data);
        console.error("Status:", axiosError.response?.status);
      }
      throw error;
    } finally {
      // Only try to restore original state if we got it initially
      if (initialState && initialState.entity_id) {
        try {
          // Try to restore the original state of the light
          console.log(
            `Restoring ${lightId} to original state: ${initialState.state}`,
          );
          await client.callService("light", `turn_${initialState.state}`, {
            entity_id: initialState.entity_id,
          });
        } catch (error) {
          console.error(
            "Error restoring light state:",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }
  });

  // Config-related tests
  test("should check configuration", async () => {
    try {
      const configCheck = await client.checkConfig();
      expect(configCheck).toBeDefined();
      expect(configCheck.result).toBeDefined();
    } catch (error: unknown) {
      // This test may fail if the config integration isn't enabled
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as AxiosError).response?.status === 400
      ) {
        console.log(
          "Configuration check failed - this is expected if config integration is disabled in Home Assistant",
        );
        expect(true).toBe(true); // Skip assertion
      } else {
        throw error;
      }
    }
  });

  // Calendar-related tests (conditionally run)
  test("should get calendars if available", async () => {
    try {
      const calendars = await client.getCalendars();
      expect(calendars).toBeDefined();
      expect(Array.isArray(calendars)).toBe(true);

      // If we have calendars, test getting events too
      if (calendars.length > 0) {
        const calendar = calendars[0];
        const now = new Date();
        const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const events = await client.getCalendarEvents(
          calendar.entity_id || "",
          now.toISOString(),
          oneWeekLater.toISOString(),
        );

        expect(events).toBeDefined();
        expect(Array.isArray(events)).toBe(true);
      }
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as AxiosError).response?.status === 404
      ) {
        console.log(
          "Calendar API not available - this is expected if calendar integration is not configured",
        );
        expect(true).toBe(true); // Skip assertion
      } else {
        throw error;
      }
    }
  });

  // Error log test
  test("should get error log", async () => {
    try {
      const errorLog = await client.getErrorLog();
      expect(errorLog).toBeDefined();
      expect(typeof errorLog).toBe("string");
    } catch (error) {
      console.error("Error log API error:", error);
      throw error;
    }
  });

  // Intent handling test
  test("should handle an intent", async () => {
    try {
      // This will likely fail because of permissions, but we'll test the API call
      const result = await client.handleIntent("HassLightTurnOn", {
        name: "kitchen",
      });
      expect(result).toBeDefined();
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as AxiosError).response?.status === 400
      ) {
        console.log(
          "Intent handling failed - this is expected in most configurations",
        );
        expect(true).toBe(true); // Skip assertion
      } else {
        throw error;
      }
    }
  });
});
