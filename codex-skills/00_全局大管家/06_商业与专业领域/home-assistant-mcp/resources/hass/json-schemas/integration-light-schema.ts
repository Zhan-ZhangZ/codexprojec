import { z } from "zod";

export const TimePeriodMapSchema = z.object({
  days: z.union([z.string(), z.number()]).optional(),
  hours: z.union([z.string(), z.number()]).optional(),
  milliseconds: z.union([z.string(), z.number()]).optional(),
  minutes: z.union([z.string(), z.number()]).optional(),
  seconds: z.union([z.string(), z.number()]).optional(),
});

export const EntitiesSchema = z.union([
  z
    .string()
    .regex(
      /^(?!.+__)(?!_)[\da-z_]+(?<!_)\.(?!_)[\da-z_]+(?<!_)\s?(?:,\s?(?!.+__)(?!_)[\da-z_]+(?<!_)\.(?!_)[\da-z_]+(?<!_))*$/,
    ),
  z.array(
    z.string().regex(/^(?!.+__)(?!_)[\da-z_]+(?<!_)\.(?!_)[\da-z_]+(?<!_)$/),
  ),
]);

export const LightPlatformSchema = z.object({
  platform: z.literal("group"),
  all: z.boolean().optional(),
  entities: EntitiesSchema,
  name: z.string().optional(),
  unique_id: z.string().optional(),
  entity_namespace: z.string().optional(),
  scan_interval: z
    .union([TimePeriodMapSchema, z.string(), z.number()])
    .optional(),
});

export const LightPlatformItemSchema = z.object({
  availability_template: z.string().optional(),
  effect_list_template: z.string().optional(),
  effect_template: z.string().optional(),
  entity_picture_template: z.string().optional(),
  friendly_name: z.string().optional(),
  hs_template: z.string().optional(),
  icon_template: z.string().optional(),
  level_template: z.string().optional(),
  max_mireds_template: z.string().optional(),
  min_mireds_template: z.string().optional(),
  rgb_template: z.string().optional(),
  rgbw_template: z.string().optional(),
  rgbww_template: z.string().optional(),
  set_level: z.any().optional(),
  set_rgb: z.any().optional(),
  set_rgbw: z.any().optional(),
  set_rgbww: z.any().optional(),
  set_temperature: z.any().optional(),
  supports_transition_template: z.string().optional(),
  temperature_template: z.string().optional(),
  turn_off: z.any().optional(),
  turn_on: z.any().optional(),
});

export const LightPlatformSchema_1 = z.object({
  platform: z.literal("template"),
  lights: z.record(z.union([z.string(), LightPlatformItemSchema])),
  entity_namespace: z.string().optional(),
  scan_interval: z
    .union([TimePeriodMapSchema, z.string(), z.number()])
    .optional(),
});

export const IntegrationLightSchema = z.union([
  LightPlatformSchema,
  LightPlatformSchema_1,
  z.array(z.any()),
]);
