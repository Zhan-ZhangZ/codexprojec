/* eslint-disable @typescript-eslint/no-namespace */
import type { operations } from "../../api";

export namespace intent.core {
  export interface Request {
    intent: string;
    slots?: Record<string, unknown>;
  }

  export type Response = operations["HandleIntent"]["responses"]["200"]["content"]["application/json"];
}
