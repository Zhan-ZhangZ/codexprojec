/* eslint-disable @typescript-eslint/no-namespace */

import type { components, operations } from "../../api";

export namespace logbook.core {
  export type Entry = components["schemas"]["LogbookEntry"];

  export type Options = operations["LogbookEntries"]["parameters"]["query"];

  export type DefaultOptions = operations["LogbookEntriesDefault"]["parameters"]["query"];
}
