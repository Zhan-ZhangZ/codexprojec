import { z } from "zod";

// Basic service types
export type HassServiceData = Record<string, unknown>;

export interface HassServiceField {
  description?: string;
  example?: unknown;
  required?: boolean;
  selector?: Record<string, unknown>;
}

export interface HassService {
  domain: string;
  services: string[];
  service?: string;
  description?: string;
  fields?: Record<string, HassServiceField>;
  target?: Record<string, unknown>;
}

export interface HassServiceDetail {
  name: string;
  description?: string;
  fields?: Record<string, HassServiceField>;
  target?: Record<string, unknown>;
}

export type HassServices = Record<string, Record<string, HassServiceDetail>>;

// Service call types
export interface ServiceCallRequest {
  domain: string;
  service: string;
  data?: HassServiceData;
}

export interface ServiceCallResponse {
  context: {
    id: string;
    parent_id?: string | null;
    user_id?: string | null;
  };
  [key: string]: unknown;
}

export interface ProcessedServiceCallResponse {
  context?: {
    id: string;
    parent_id?: string | null;
    user_id?: string | null;
  };
  message?: string;
  raw_response?: string;
  [key: string]: unknown;
}

// Zod schema for service calls
export const callServiceSchema = {
  domain: z
    .string()
    .describe("Service domain (e.g., 'light', 'switch', 'automation'). This specifies the integration or component that provides the service."),
  service: z.string().describe("Service name (e.g., 'turn_on', 'turn_off'). This specifies the action to perform within the domain."),
  service_data: z
    .record(z.any())
    .optional()
    .describe("Optional service data to pass to the service. This can include entity_id and service-specific parameters like brightness, temperature, etc. For example, {\"entity_id\": \"light.living_room\", \"brightness\": 255, \"color_name\": \"blue\"}"),
  target: z
    .record(z.any())
    .optional()
    .describe("Optional target entities for the service call. This is an alternative to specifying entity_id in service_data."),
  return_response: z
    .boolean()
    .optional()
    .default(false)
    .describe("When set to true, includes service response data in the result. Default is false."),
};
