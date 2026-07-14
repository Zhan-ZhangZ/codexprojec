/* eslint-disable @typescript-eslint/no-namespace */
import type {
  BaseSuccessResponse,
  DomainName,
  EntityId,
  ServiceName
} from '../../common/types.js';
import type { components } from "../../api";

/**
 * Core Service Types
 */

export interface BaseServiceParams {
  entity_id?: EntityId | EntityId[];
  area_id?: string | string[];
  device_id?: string | string[];
}

export interface ServiceCallRequest {
  domain: DomainName;
  service: ServiceName;
  target?: BaseServiceParams;
  service_data?: Record<string, unknown>;
}

export interface ServiceCallResponse extends BaseSuccessResponse {
  result?: unknown;
}

export interface ServiceDefinition {
  name: string;
  description?: string;
  target?: {
    entity?: {
      domain: DomainName[];
    };
    device?: {
      integration: string[];
    };
  };
  fields?: Record<string, {
    name: string;
    description?: string;
    required?: boolean;
    example?: unknown;
    selector?: Record<string, unknown>;
  }>;
}

export interface ServiceDomain {
  domain: DomainName;
  services: Record<ServiceName, ServiceDefinition>;
}

export interface ServiceListResponse extends BaseSuccessResponse {
  domains: ServiceDomain[];
}

export interface TemplateRenderRequest {
  template: string;
  variables?: Record<string, unknown>;
}

export interface TemplateRenderResponse extends BaseSuccessResponse {
  result: string;
}

export interface ConfigCheckResponse extends BaseSuccessResponse {
  result: {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  };
}

export interface IntentHandleRequest {
  name: string;
  data?: Record<string, unknown>;
}

export interface IntentHandleResponse extends BaseSuccessResponse {
  response: {
    speech: {
      plain: {
        speech: string;
        extra_data?: unknown;
      };
    };
  };
}

export namespace service.core {
  export type Service = components["schemas"]["Service"];
  export type ServiceData = Record<string, unknown>;

  export interface CallRequest {
    domain: string;
    service: string;
    data?: ServiceData;
  }
}
