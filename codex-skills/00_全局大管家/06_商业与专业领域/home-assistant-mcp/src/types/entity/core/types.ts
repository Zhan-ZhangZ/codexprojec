/* eslint-disable @typescript-eslint/no-namespace */
import type {
  BaseSuccessResponse,
  EntityContext,
  EntityId,
  ISO8601DateTime
} from '../../common/types.js';
import type { components } from "../../api";

/**
 * Core Entity Types
 */

export interface State {
  entity_id: EntityId;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: ISO8601DateTime;
  last_updated: ISO8601DateTime;
  context: EntityContext;
}

export interface UpdateRequest {
  state: string;
  attributes?: Record<string, unknown>;
}

export interface StateResponse extends BaseSuccessResponse {
  state: State;
}

export interface StatesResponse extends BaseSuccessResponse {
  states: State[];
}

export namespace entity.core {
  export type State = components["schemas"]["State"];
  export type Attributes = Record<string, unknown>;

  export type EventObject = components["schemas"]["EventObject"];
}
