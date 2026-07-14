import type {
  BaseSuccessResponse,
  EntityId,
  ISO8601DateTime,
  TimestampRange
} from '../../common/types.js';

/**
 * History State Types
 */

export interface HistoryQueryParams extends Partial<TimestampRange> {
  filter_entity_id?: EntityId | EntityId[];
  minimal_response?: boolean;
  significant_changes_only?: boolean;
}

export interface HistoryPeriodParams extends HistoryQueryParams {
  timestamp?: ISO8601DateTime;
}

export interface HistoryStateChange {
  entity_id: EntityId;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: ISO8601DateTime;
  last_updated: ISO8601DateTime;
}

export interface HistoryPeriodResponse extends BaseSuccessResponse {
  history: HistoryStateChange[];
}

export interface LogbookQueryParams extends Partial<TimestampRange> {
  entity_id?: EntityId | EntityId[];
}

export interface LogbookPeriodParams extends LogbookQueryParams {
  timestamp?: ISO8601DateTime;
}

export interface LogbookEntry {
  when: ISO8601DateTime;
  name: string;
  message: string;
  domain: string;
  entity_id: EntityId;
}

export interface LogbookResponse extends BaseSuccessResponse {
  entries: LogbookEntry[];
}
