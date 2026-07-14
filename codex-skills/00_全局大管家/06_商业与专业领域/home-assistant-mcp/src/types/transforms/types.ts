/* eslint-disable @typescript-eslint/no-namespace */
export namespace transforms {
  export interface Rule<T, R> {
    selector: string | RegExp | ((item: T) => boolean);
    transform: (item: T) => R;
  }

  export interface SimplifiedEntity {
    id: string;
    name: string;
    state: string;
    type: string;
    updateTime: string;
    mainAttributes: Record<string, unknown>;
  }

  export interface SimplifiedService {
    id: string;
    name: string;
    description?: string;
    domain: string;
    fields: Record<string, {
      name: string;
      description?: string;
      required?: boolean;
      type?: string;
      default?: unknown;
    }>;
  }
}
