/// <reference types="node" />

/* eslint-disable @typescript-eslint/no-namespace */
/**
 * @packageDocumentation
 * @module api.core.types
 */

import type { components } from "../../api";

export namespace api.core.types {
  export type ApiError = components["schemas"]["Error"];
  export type Response<T> = T;
  export type Success = { message: string };

  export interface Base {
    success: boolean;
    message?: string;
  }

  export interface ErrorResponse extends Base {
    success: false;
    error: string;
    error_code?: string;
  }

  export interface UnitSystem {
    length: string;
    mass: string;
    temperature: string;
    volume: string;
  }

  export interface SystemConfig {
    latitude: number;
    longitude: number;
    elevation: number;
    unit_system: UnitSystem;
    location_name: string;
    time_zone: string;
    components: string[];
    version: string;
    config_dir: string;
    whitelist_external_dirs: string[];
    allowlist_external_dirs: string[];
    allowlist_external_urls: string[];
    config_source: string;
    safe_mode: boolean;
    state: string;
    external_url: string | null;
    internal_url: string | null;
    currency: string;
    country: string | null;
    language: string;
  }

  export interface Config extends Base {
    success: true;
    config: SystemConfig;
  }

  export interface EventContext {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  }

  export interface Event {
    event_type: string;
    data: Record<string, unknown>;
    origin: string;
    time_fired: string;
    context: EventContext;
  }

  export interface Calendar {
    entity_id: string;
    name: string;
    device_id: string | null;
  }

  export interface CalendarEvent {
    start: string;
    end: string;
    summary: string;
    description: string | null;
    location: string | null;
    uid: string | null;
    recurrence_id: string | null;
    rrule: string | null;
  }

  export interface ServiceField {
    description: string;
    example: unknown;
    selector?: Record<string, unknown>;
  }

  export interface Service {
    name: string;
    description: string;
    target?: Record<string, unknown>;
    fields: Record<string, ServiceField>;
  }

  export type EntityId = string;
  export type Timestamp = string;

  export interface Params {
    entity_id: EntityId;
    timestamp: Timestamp;
  }

  // Response Types
  export type SuccessResponse<T> = Base & {
    success: true;
  } & T;

  export type Status = SuccessResponse<{
    message: string;
  }>;

  export type Events = SuccessResponse<{
    events: Event[];
  }>;

  export type Calendars = SuccessResponse<{
    calendars: Calendar[];
  }>;

  export type CalendarEvents = SuccessResponse<{
    events: CalendarEvent[];
  }>;

  export type Services = SuccessResponse<{
    services: Record<string, Record<string, Service>>;
  }>;

  // Utility types for working with responses
  export type ExtractResponseData<T> = T extends SuccessResponse<infer D> ? D : never;
  export type ServiceMap = ExtractResponseData<Services>["services"];
  export type EventList = ExtractResponseData<Events>["events"];
  export type CalendarList = ExtractResponseData<Calendars>["calendars"];
}
