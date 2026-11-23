"use client";
import { useEffect, useRef, useState } from "react";
import type { CatalogProvider, ModelCatalogResult, ModelCatalogStatus } from "@/lib/model-catalog";

const EMPTY_MODELS: ModelCatalogResult["models"] = [];
const EMPTY_STATUSES: ModelCatalogStatus[] = [];

/** A config change immediately hides results from the previous credentials; late replies never win. */
export function useModelCatalog(providers: CatalogProvider[]) {
  const signature = JSON.stringify([...providers].sort((a, b) => a.name.localeCompare(b.name)));
  const [state, setState] = useState<{ signature: string; result: ModelCatalogResult; pending: string[] }>({ signature: "", result: { models: [], providers: [] }, pending: [] });
  const [refresh, setRefresh] = useState({ provider: "", nonce: 0 });
  const activeSignature = useRef("");
  useEffect(() => {
    const configured = JSON.parse(signature) as CatalogProvider[];
    const changed = activeSignature.current !== signature;
    activeSignature.current = signature;
    const requested = !changed && refresh.provider ? configured.filter((p) => p.name === refresh.provider) : configured;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((previous) => ({ signature, result: previous.signature === signature ? previous.result : { models: [], providers: [] }, pending: requested.map((p) => p.name) }));
      void Promise.all(requested.map(async (provider) => {
        let result: ModelCatalogResult;
        try {
          const response = await fetch("/api/ai/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providers: [provider], refresh: refresh.nonce > 0 }), signal: controller.signal });
          if (!response.ok) throw new Error("CATALOG_UNAVAILABLE");
          result = await response.json();
        } catch {
          if (controller.signal.aborted) return;
          result = { models: [], providers: (["image", "video"] as const).map((mediaType): ModelCatalogStatus => ({ provider: provider.name, mediaType, status: "error", checkedAt: new Date().toISOString(), durationMs: 0, count: 0, errorCode: "CATALOG_UNAVAILABLE" })) };
        }
        if (controller.signal.aborted) return;
        setState((previous) => previous.signature !== signature ? previous : ({ ...previous, pending: previous.pending.filter((name) => name !== provider.name), result: { models: [...previous.result.models.filter((model) => model.provider !== provider.name), ...result.models], providers: [...previous.result.providers.filter((status) => status.provider !== provider.name), ...result.providers] } }));
      }));
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [signature, refresh]);
  const current = state.signature === signature ? state : null;
  return { models: current?.result.models ?? EMPTY_MODELS, statuses: current?.result.providers ?? EMPTY_STATUSES, pending: current?.pending ?? providers.map((p) => p.name), loading: !current || current.pending.length > 0, retry: (provider = "") => setRefresh((value) => ({ provider, nonce: value.nonce + 1 })) };
}
