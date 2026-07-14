// https://www.home-assistant.io/integrations/light/#action-lightturn_on

import { z } from "zod";

export default z.object({
  action: z.enum(["turn_on", "turn_off", "toggle"]),
  domain: z.literal("light"),
  service_data: z.object({
    entity_id: z
      .union([
        z.string().describe("Single entity ID of the light"),
        z
          .array(z.string())
          .nonempty()
          .describe("Array of entity IDs for multiple lights"),
      ])
      .describe("Entity ID(s) of the light(s) to control"),
  }),

  transition: z
    .number()
    .nonnegative()
    .default(0)
    .describe("Transition duration in seconds (default: 0)"),

  profile: z.string().optional().describe("Name of built-in or custom profile"),

  hs_color: z
    .tuple([
      z.number().min(0).max(360).describe("Hue value (0-360)"),
      z.number().min(0).max(100).describe("Saturation value (0-100)"),
    ])
    .optional()
    .describe("Hue and saturation color values"),

  xy_color: z
    .tuple([
      z.number().min(0).max(1).describe("X coordinate (0-1)"),
      z.number().min(0).max(1).describe("Y coordinate (0-1)"),
    ])
    .optional()
    .describe("XY color coordinates"),

  rgb_color: z
    .tuple([
      z.number().min(0).max(255),
      z.number().min(0).max(255),
      z.number().min(0).max(255),
    ])
    .optional()
    .describe("RGB color values (0-255)"),

  rgbw_color: z
    .tuple([
      z.number().min(0).max(255),
      z.number().min(0).max(255),
      z.number().min(0).max(255),
      z.number().min(0).max(255),
    ])
    .optional()
    .describe("RGBW color values (0-255)"),

  rgbww_color: z
    .tuple([
      z.number().min(0).max(255),
      z.number().min(0).max(255),
      z.number().min(0).max(255),
      z.number().min(0).max(255),
      z.number().min(0).max(255),
    ])
    .optional()
    .describe("RGBWW color values (0-255)"),

  color_temp_kelvin: z
    .number()
    .min(1000)
    .max(40000)
    .optional()
    .describe("Color temperature in Kelvin"),

  kelvin: z
    .number()
    .min(1000)
    .max(40000)
    .optional()
    .describe("Deprecated: Use color_temp_kelvin instead"),

  color_temp: z
    .number()
    .optional()
    .describe("Deprecated: Color temperature in Mireds"),

  color_name: z.string().optional().describe("CSS3 color name"),

  brightness: z
    .number()
    .min(0)
    .max(255)
    .optional()
    .describe("Brightness level (0-255)"),

  brightness_pct: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Brightness percentage (0-100)"),

  brightness_step: z
    .number()
    .min(-255)
    .max(255)
    .optional()
    .describe("Incremental brightness adjustment (-255 to 255)"),

  brightness_step_pct: z
    .number()
    .min(-100)
    .max(100)
    .optional()
    .describe("Incremental brightness percentage adjustment (-100 to 100)"),

  white: z.boolean().default(false).describe("Set the light to white mode"),

  flash: z
    .enum(["short", "long"])
    .optional()
    .describe("Flash duration: short or long"),

  effect: z
    .string()
    .optional()
    .describe("Effect name (e.g., colorloop, random)"),
});
