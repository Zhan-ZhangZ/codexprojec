/* eslint-disable @typescript-eslint/no-namespace */
import type { components } from "../../api";

export namespace calendar.core {
  export type Object = components["schemas"]["CalendarObject"];
  export type Event = components["schemas"]["CalendarEvent"];

  export interface EventsRequest {
    calendarEntityId: string;
    start: string;
    end: string;
  }
}
