import type { EntityId } from '../common/types';
import type { State } from '../entity/core/types';

export interface Filter {
  stateChange?: boolean;
  attributeChanges?: string[];
  minStateChangeAge?: number; // in milliseconds
}

export interface Details {
  callback: (data: unknown) => void;
  filter?: Filter;
  filters?: Filter; // For backward compatibility
  entityIds: EntityId[]; // Required since we always provide it
  lastChecked?: Date;
  expiresAt?: Date;
  callbackId?: string;
  unsubscribe?: () => void;
}

export interface Entity extends Omit<State, 'state'> {
  entity_id: EntityId;
  state: string;
  changed_attributes?: string[]; // New field to track which attributes changed
}
