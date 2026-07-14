import { z } from "zod";
import type { HassEntity } from "../types/entities/entity.types.js";
import type {
  ColorHS,
  ColorRGB,
  ColorXY
} from "../types/common/types.js";

/**
 * Interface for Home Assistant light entities with properly typed attributes
 */
export interface HassLightEntity extends HassEntity {
  attributes: {
    friendly_name?: string;
    supported_features?: number;
    supported_color_modes?: string[];
    brightness?: number;
    color_mode?: string;
    min_mireds?: number;
    max_mireds?: number;
    effect_list?: string[];
    effect?: string;
    hs_color?: ColorHS;
    rgb_color?: ColorRGB;
    xy_color?: ColorXY;
    color_temp?: number;
    [key: string]: unknown;
  };
}

/**
 * Light effect enum based on common effect types
 * Used for type safety in the tool schema
 */
export const LightEffectsEnum = z.enum([
  "none",
  "colorloop",
  "random",
  "bounce",
  "candle",
  "fireworks",
  "custom",
]);

/**
 * Light color modes based on common types
 * Used for type safety in the tool schema
 */
export const ColorModeEnum = z.enum([
  "color_temp",
  "hs",
  "rgb",
  "rgbw",
  "rgbww",
  "xy",
  "brightness",
  "onoff",
]);

/**
 * Bit flags for light features support
 */
export const SUPPORT_BRIGHTNESS = 1;
export const SUPPORT_COLOR_TEMP = 2;
export const SUPPORT_EFFECT = 4;
export const SUPPORT_FLASH = 8;
export const SUPPORT_COLOR = 16;
export const SUPPORT_TRANSITION = 32;
