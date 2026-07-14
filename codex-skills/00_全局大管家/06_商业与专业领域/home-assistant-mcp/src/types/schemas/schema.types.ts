import { z } from "zod";

export const getStatesSchema = {
  entity_id: z
    .string()
    .optional()
    .describe(
      "Optional entity ID to get a specific entity state (format: domain.entity, e.g., light.kitchen). If omitted, all states are returned.",
    ),
  simplified: z
    .boolean()
    .optional()
    .describe("Return simplified entity data structure for easier consumption."),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Maximum number of items to return in the response. Default is 100."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Number of items to skip before starting to collect the result set. Default is 0."),
};

export const getHistorySchema = {
  entity_id: z
    .string()
    .optional()
    .describe("Optional entity ID to filter history. Can be a single entity or comma-separated list of entity IDs (e.g., 'light.living_room,sensor.temperature')."),
  start_time: z
    .string()
    .optional()
    .describe("Start time in ISO 8601 format (e.g., '2023-01-01T00:00:00Z'). If not specified, defaults to 1 day before the request time."),
  end_time: z
    .string()
    .optional()
    .describe("End time in ISO 8601 format. If not specified, the current time will be used."),
  simplified: z
    .boolean()
    .optional()
    .describe("Return simplified history data structure for easier consumption."),
  minimal_response: z
    .boolean()
    .optional()
    .describe("Only return last_changed and state for states other than the first and last state, reducing response size."),
  significant_changes_only: z
    .boolean()
    .optional()
    .default(true)
    .describe("Only return states with significant changes. Default is true."),
  no_attributes: z
    .boolean()
    .optional()
    .describe("Skip returning attributes from the database, further reducing response size."),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Maximum number of items to return in the response. Default varies by endpoint."),
};

export const renderTemplateSchema = {
  template: z.string().describe("Home Assistant template string to render. Templates use the Jinja2 template engine and can access the Home Assistant state machine via a special 'states' variable. For example: '{{ states(\"sensor.temperature\") }}' would return the current state of the temperature sensor."),
  simplified: z
    .boolean()
    .optional()
    .describe("Return simplified template output format. Useful for cleaner responses when working with complex templates."),
};

export const fireEventSchema = {
  event_type: z.string().describe("Event type to fire"),
  event_data: z.record(z.any()).optional().describe("Optional event data"),
};

export const getLogbookSchema = {
  start_time: z
    .string()
    .optional()
    .describe("Start time in ISO format (e.g., '2023-01-01T00:00:00Z')"),
  entity_id: z
    .string()
    .optional()
    .describe("Optional entity ID to filter logbook entries"),
};

export const getCameraImageSchema = {
  camera_entity_id: z
    .string()
    .describe("Entity ID of the camera (e.g., 'camera.front_door')"),
};

export const getCalendarEventsSchema = {
  calendar_entity_id: z
    .string()
    .describe("Entity ID of the calendar (e.g., 'calendar.home')"),
  start_time: z
    .string()
    .describe("Start time in ISO format (e.g., '2023-01-01T00:00:00Z')"),
  end_time: z.string().describe("End time in ISO format"),
};

export const handleIntentSchema = {
  intent_name: z.string().describe("Name of the intent to handle"),
  intent_data: z
    .record(z.any())
    .optional()
    .describe("Optional data for the intent slots"),
};

export const updateEntityStateSchema = {
  entity_id: z.string().describe("Entity ID to update or create"),
  state: z.string().describe("New state value"),
  attributes: z
    .record(z.any())
    .optional()
    .describe("Optional attributes for the entity"),
};

export const getDevicesSchema = {
  random_string: z
    .string()
    .optional()
    .describe("Dummy parameter for no-parameter tools"),
};

export const getLightsSchema = {
  entity_id: z
    .string()
    .optional()
    .describe("Optional light entity ID to filter results"),
  include_details: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include detailed information about supported features"),
};

export const lightControlSchema = {
  entity_id: z
    .string()
    .describe("Light entity ID to control (e.g., 'light.living_room')"),
  action: z
    .enum(["turn_on", "turn_off", "toggle"])
    .describe("Action to perform on the light"),
  brightness: z
    .number()
    .min(0)
    .max(255)
    .optional()
    .describe("Brightness level (0-255, where 255 is maximum brightness)"),
  brightness_pct: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Brightness percentage (0-100%)"),
  color_temp: z.number().optional().describe("Color temperature in mireds"),
  kelvin: z.number().optional().describe("Color temperature in Kelvin"),
  hs_color: z
    .array(z.number())
    .length(2)
    .optional()
    .describe("Hue/Saturation color as [hue (0-360), saturation (0-100)]"),
  rgb_color: z
    .array(z.number().min(0).max(255))
    .length(3)
    .optional()
    .describe("RGB color as [r, g, b] with values from 0-255"),
  xy_color: z
    .array(z.number())
    .length(2)
    .optional()
    .describe("CIE xy color as [x (0-1), y (0-1)]"),
  color_name: z.string().optional().describe("CSS3 color name"),
};
