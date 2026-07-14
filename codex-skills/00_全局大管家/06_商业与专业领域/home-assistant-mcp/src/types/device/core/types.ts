import type {
  BaseSuccessResponse,
  DeviceConnection,
  DeviceIdentifier,
  ISO8601DateTime
} from '../../common/types.js';

/**
 * Core Device Types
 */

export interface Device {
  id: string;
  name: string;
  model?: string;
  manufacturer?: string;
  area_id?: string;
  config_entries?: string[];
  connections?: DeviceConnection[];
  identifiers?: DeviceIdentifier[];
  sw_version?: string;
  hw_version?: string;
  via_device_id?: string;
  disabled_by?: string | null;
  entry_type?: string | null;
  name_by_user?: string | null;
  configuration_url?: string | null;
}

export interface DeviceListResponse extends BaseSuccessResponse {
  devices: Device[];
}

export interface DeviceState {
  id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: ISO8601DateTime;
  last_updated: ISO8601DateTime;
}

export interface DeviceStateResponse extends BaseSuccessResponse {
  state: DeviceState;
}

export interface DeviceStatesResponse extends BaseSuccessResponse {
  states: DeviceState[];
}

export interface DeviceRegistryEntry {
  id: string;
  config_entries: string[];
  connections: DeviceConnection[];
  identifiers: DeviceIdentifier[];
  manufacturer: string;
  model: string;
  name: string;
  sw_version?: string;
  hw_version?: string;
  via_device_id?: string;
}

export interface DeviceRegistryResponse extends BaseSuccessResponse {
  devices: DeviceRegistryEntry[];
}
