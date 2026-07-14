import type { MessageBase } from "../websocket/types.js";

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
  context?: {
    id?: string;
    parent_id?: string;
    user_id?: string;
  };
}

export interface Connection {
  addEventListener(event: "ready" | "disconnected", callback: () => void): void;
  removeEventListener(event: "ready" | "disconnected", callback: () => void): void;
  sendMessagePromise<T = unknown>(message: MessageBase): Promise<T>;
  close(): void;
}

export function isHassEntity(obj: unknown): obj is HassEntity {
  if (!obj || typeof obj !== "object") return false;

  const entity = obj as Partial<HassEntity>;
  return (
    typeof entity.entity_id === "string" &&
    typeof entity.state === "string" &&
    (!entity.last_changed || typeof entity.last_changed === "string") &&
    (!entity.last_updated || typeof entity.last_updated === "string") &&
    (!entity.context || (
      typeof entity.context === "object" &&
      (!entity.context.id || typeof entity.context.id === "string") &&
      (!entity.context.parent_id || typeof entity.context.parent_id === "string") &&
      (!entity.context.user_id || typeof entity.context.user_id === "string")
    ))
  );
}
