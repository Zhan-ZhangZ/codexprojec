import type { Model } from "@/lib/providers/types";
export interface CatalogProvider { name: string; apiKey?: string; baseUrl?: string }
export interface ModelCatalogStatus {
  provider: string; mediaType: "image" | "video"; status: "ready" | "empty" | "error" | "fallback";
  checkedAt: string; durationMs: number; count: number; errorCode?: "CATALOG_TIMEOUT" | "CATALOG_UNAVAILABLE";
  source?: "static" | "live" | "cache" | "stale"; catalogUpdatedAt?: string;
}
export interface ModelCatalogResult { models: Model[]; providers: ModelCatalogStatus[] }
