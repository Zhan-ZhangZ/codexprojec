"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

interface ModelPickerProps {
  baseUrl: string;
  apiKey: string;
  onPick: (model: string) => void;
}

/** 地址或凭证改变时立即重建目录，旧请求不能污染新配置。key 不输出到 DOM。 */
export function ModelPicker(props: ModelPickerProps) {
  return <EndpointModelPicker key={JSON.stringify([props.baseUrl, props.apiKey])} {...props} />;
}

function EndpointModelPicker({ baseUrl, apiKey, onPick }: ModelPickerProps) {
  const t = useT("settings");
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [loaded, setLoaded] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  const load = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    setState("loading");
    setError("");
    setModels([]);
    setLoaded(false);
    try {
      const res = await fetch("/api/llm/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey }),
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (request.current !== controller) return;
      if (controller.signal.aborted) throw new Error("MODEL_LIST_TIMEOUT");
      if (!res.ok || !data.ok || !Array.isArray(data.models)) throw new Error("MODEL_LIST_UNAVAILABLE");
      setModels([...new Set<string>(data.models.filter((model: unknown): model is string => typeof model === "string" && model.trim().length > 0))]);
      setLoaded(true);
    } catch {
      if (request.current === controller) setError(t("modelListFailed"));
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setState("idle");
    }
  };

  // Long catalogues (OpenRouter ships 300+) need a filter to be usable at all.
  const shown = filter ? models.filter((m) => m.toLowerCase().includes(filter.toLowerCase())) : models;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={load}
        disabled={!baseUrl.trim() || state === "loading"}
        className="min-h-9 text-xs text-primary underline underline-offset-2 disabled:opacity-50 disabled:no-underline"
      >
        {state === "loading" ? t("modelListLoading") : t("modelListButton")}
      </button>
      {error && <p role="alert" className="text-xs text-destructive break-all">{error}</p>}
      {loaded && models.length === 0 && <p role="status" className="text-xs text-muted-foreground">{t("modelListEmpty")}</p>}
      {models.length > 0 && (
        <div className="rounded-md border border-border/50 bg-muted/30 p-2 space-y-1.5">
          {models.length > 12 && (
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("modelListFilter")}
              aria-label={t("modelListFilter")}
              className="w-full rounded border border-border/50 bg-background px-2 py-1 text-[11px] font-mono outline-none focus:border-primary/40"
            />
          )}
          <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
            {shown.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onPick(m)}
                className="min-h-9 max-w-full break-all rounded border border-border/50 bg-background px-2 py-1 font-mono text-xs hover:border-primary/40 hover:text-primary transition-colors"
              >
                {m}
              </button>
            ))}
            {shown.length === 0 && <span className="text-[11px] text-muted-foreground">{t("modelListNoMatch")}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
