/* eslint-disable @typescript-eslint/no-namespace */
import type { components, operations } from "../../api";

export namespace config.core {
  export type Config = components["schemas"]["ConfigResponse"];
  export type UnitSystem = Config["unit_system"];

  export type CheckResponse = operations["CheckConfig"]["responses"]["200"]["content"]["application/json"];
}
