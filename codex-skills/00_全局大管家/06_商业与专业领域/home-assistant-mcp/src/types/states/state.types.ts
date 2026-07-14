export interface HassAttributes {
  [key: string]: unknown;
  friendly_name?: string;
  unit_of_measurement?: string;
  icon?: string;
  device_class?: string;
  brightness?: number;
  rgb_color?: number[];
  effect?: string;
  color_temp?: number;
  hvac_mode?: string;
  hvac_action?: string;
  temperature?: number;
  current_temperature?: number;
  preset_modes?: string[];
}

export interface HassState {
  entity_id: string;
  state: string;
  attributes: HassAttributes;
  last_changed?: string;
  last_updated?: string;
  context?: {
    id?: string;
    parent_id?: string | null;
    user_id?: string | null;
  };
}
