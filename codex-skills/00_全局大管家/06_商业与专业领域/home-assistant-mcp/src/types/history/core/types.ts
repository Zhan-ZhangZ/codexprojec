/* eslint-disable @typescript-eslint/no-namespace */
import type { components, operations } from "../../api";

export namespace history.core {
  export type StateChange = components["schemas"]["HistoryStateChange"];

  export type Response = operations["HistoryPeriod"]["responses"]["200"]["content"]["application/json"];

  export type Options = operations["HistoryPeriod"]["parameters"]["query"];

  export type DefaultOptions = operations["HistoryPeriodDefault"]["parameters"]["query"];
}
