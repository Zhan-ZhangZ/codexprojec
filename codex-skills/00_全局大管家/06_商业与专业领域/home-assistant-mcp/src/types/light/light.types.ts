import type { HassServiceData } from "../services/service.types";

export interface LightServiceData extends HassServiceData {
  brightness?: number;
  rgb_color?: number[];
  effect?: string;
}

export interface ServiceAction {
  /**
   * Service call alias.
   */
  alias?: string;
  /**
   * Every individual action can be disabled, without removing it.
   */
  enabled?: boolean;
  /**
   * Set it to true if you'd like to continue the action sequence, regardless of whether that action encounters an error.
   */
  continue_on_error?: boolean;
  /**
   * Legacy syntax, use "action" instead.
   */
  service?: {
    [k: string]: unknown;
  }[];
  /**
   * The most important action is to call an action.
   */
  action?: string;
  /**
   * You can use templates directly in the service parameter, replace "service_template" with just "service".
   */
  service_template?: {
    [k: string]: unknown;
  }[];
  /**
   * Specify other parameters beside the entity to target.
   */
  data?:
    | {
        [k: string]: unknown;
      }
    | string;
  /**
   * You can use templates directly in the data parameter, replace "data_template" with just "data".
   */
  data_template?: {
    [k: string]: unknown;
  }[];
  /**
   * The entity (or entities) to execute this service call on.
   */
  entity_id?: string[] | (null | string);
  /**
   * Defines the target (area(s), device(s) and entitie(s)) to execute this service call on.
   */
  target?:
    | {
        entity_id?: string[] | (null | string);
        device_id?: string[] | string;
        area_id?: string[] | string;
        floor_id?: string[] | string;
        label_id?: string[] | string;
      }
    | string;
  /**
   * Additional data for merely for use with the frontend. Has no functional effect.
   */
  metadata?: {
    [k: string]: unknown;
  };
  /**
   * Add a response_variable to pass a variable of key/value pairs back to an automation or script.
   */
  response_variable?: string;
}
