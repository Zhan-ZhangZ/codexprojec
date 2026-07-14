import type {
  BaseSuccessResponse,
  ColorHS,
  ColorRGB,
  ColorRGBW,
  ColorRGBWW,
  ColorXY,
  EntityContext,
  EntityId,
  ISO8601DateTime
} from '../../common/types.js';

/**
 * Light Platform Types
 */

export type LightState = 'on' | 'off' | 'unavailable';
export type FlashLength = 'short' | 'long';

export interface LightCapabilities {
  supported_color_modes?: string[];
  supported_features?: number;
  min_mireds?: number;
  max_mireds?: number;
  effect_list?: string[];
}

export interface LightStateAttributes extends LightCapabilities {
  min_color_temp_kelvin?: number;
  max_color_temp_kelvin?: number;
  brightness?: number;
  color_temp_kelvin?: number;
  color_mode?: string;
  rgb_color?: ColorRGB;
  rgbw_color?: ColorRGBW;
  rgbww_color?: ColorRGBWW;
  xy_color?: ColorXY;
  hs_color?: ColorHS;
  effect?: string;
  friendly_name?: string;
  icon?: string;
}

export interface LightControlParams {
  brightness?: number;
  brightness_pct?: number;
  brightness_step?: number;
  brightness_step_pct?: number;
  color_temp_kelvin?: number;
  rgb_color?: ColorRGB;
  rgbw_color?: ColorRGBW;
  rgbww_color?: ColorRGBWW;
  xy_color?: ColorXY;
  hs_color?: ColorHS;
  effect?: string;
  flash?: FlashLength;
  transition?: number;
  white?: boolean;
}

export interface LightEntity {
  entity_id: EntityId;
  state: LightState;
  attributes: LightStateAttributes;
  last_changed: ISO8601DateTime;
  last_updated: ISO8601DateTime;
  context: EntityContext;
}

export interface LightEntityResponse extends BaseSuccessResponse {
  light: LightEntity;
}

export interface LightEntitiesResponse extends BaseSuccessResponse {
  lights: LightEntity[];
}

export interface LightControlResponse extends BaseSuccessResponse {
  result?: unknown;
}
