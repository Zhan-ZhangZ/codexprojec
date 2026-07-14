/**
 * Common Types
 */

export interface EntityContext {
  id: string;
  parent_id: string | null;
  user_id: string | null;
}

export interface BaseSuccessResponse {
  success: true;
  message?: string;
}

export interface BaseErrorResponse {
  success: false;
  error: string;
  error_code?: string;
}

export type BaseResponse = BaseSuccessResponse | BaseErrorResponse;

export type ISO8601DateTime = string;

export interface TimestampRange {
  start_time: ISO8601DateTime;
  end_time?: ISO8601DateTime;
}

export type EntityId = string;
export type DomainName = string;
export type ServiceName = string;

export interface EntityIdentifier {
  entity_id: EntityId;
  domain?: DomainName;
}

export type ColorRGB = [number, number, number];
export type ColorRGBW = [number, number, number, number];
export type ColorRGBWW = [number, number, number, number, number];
export type ColorXY = [number, number];
export type ColorHS = [number, number];

export type DeviceConnection = [string, string];
export type DeviceIdentifier = [string, string];
