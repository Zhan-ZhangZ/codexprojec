import type { HassState } from "../states/state.types";

export interface ApiSuccessResponse {
  message: string;
}

export interface HassConfig {
  components: string[];
  config_dir: string;
  elevation: number;
  latitude: number;
  location_name: string;
  longitude: number;
  time_zone: string;
  unit_system: {
    length: string;
    mass: string;
    temperature: string;
    volume: string;
  };
  version: string;
  whitelist_external_dirs: string[];
}

export interface ConfigCheckResponse {
  result: string;
  errors: string | null;
}

export interface IntentResponse {
  speech: {
    plain: {
      speech: string;
      extra_data: null | Record<string, unknown>;
    };
  };
  card: Record<string, unknown> | null;
  language: string;
}

export interface HistoryOptions {
  filter_entity_id?: string;
  end_time?: string;
  minimal_response?: boolean;
  no_attributes?: boolean;
  significant_changes_only?: boolean;
  limit?: number;
}

export type HistoryDefaultOptions = Omit<HistoryOptions, "end_time"> & {
  end_time?: string;
};

export type HistoryResponse = HassState[][];

export interface LogbookOptions {
  entity?: string;
  end_time?: string;
}

export type LogbookDefaultOptions = Omit<LogbookOptions, "end_time">;

export interface LogbookEntry {
  entity_id?: string;
  state?: string;
  when?: string;
  name?: string;
  message?: string;
  domain?: string;
  icon?: string;
}

export interface CalendarObject {
  entity_id?: string;
  name?: string;
}

export interface CalendarEvent {
  summary?: string;
  start?: string;
  end?: string;
  description?: string;
  location?: string;
  uid?: string;
}

export interface HassEventObject {
  event: string;
  listener_count: number;
}
