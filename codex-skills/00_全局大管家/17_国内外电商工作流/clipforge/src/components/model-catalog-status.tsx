"use client";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import type { ModelCatalogStatus as Status } from "@/lib/model-catalog";
export function ModelCatalogStatus({ statuses, pending, onRetry }: { statuses: Status[]; pending: string[]; onRetry: (provider?: string) => void }) {
  const zh = useLocale() === "zh";
  if (!statuses.length && !pending.length) return null;
  const names = [...new Set([...statuses.map((status) => status.provider), ...pending])].sort();
  const failures = statuses.filter((status) => status.status === "error" || status.status === "fallback").length;
  return <details className="my-3 rounded-xl border border-border/60 bg-muted/20 p-3" open={failures > 0 || undefined}>
    <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium">{pending.length ? (zh ? "正在加载模型目录…" : "Loading model catalogs…") : failures ? (zh ? `${failures} 项目录需检查` : `${failures} catalogs need attention`) : (zh ? "模型目录已加载" : "Model catalogs loaded")}</summary>
    <p className="mb-2 text-xs leading-5 text-muted-foreground">{zh ? "目录状态不代表密钥、余额或生成服务可用。这里只刷新目录，不发起生成。" : "Catalog status does not verify credentials, balance or generation availability. Refreshing does not generate content."}</p>
    {names.map((name) => <div key={name} className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 py-2">
      <div className="min-w-0 text-xs"><p className="font-medium">{name}</p>{statuses.filter((status) => status.provider === name).map((status) => <p key={status.mediaType} className={`mt-1 ${status.status === "error" || status.status === "fallback" ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground"}`}>
        {status.mediaType === "image" ? (zh ? "图片" : "Image") : (zh ? "视频" : "Video")} · {status.status === "error" ? (zh ? "目录请求失败" : "Catalog unavailable") : status.status === "fallback" ? (zh ? `更新失败，保留 ${status.count} 个备用模型` : `Refresh failed; ${status.count} fallback models`) : status.status === "empty" ? (zh ? "暂无模型" : "No models") : `${status.count} ${zh ? "个模型" : "models"}`} · {new Date(status.checkedAt).toLocaleTimeString(zh ? "zh-CN" : "en-US")}
        {status.catalogUpdatedAt && <span> · {zh ? "数据时间 " : "Data as of "}{new Date(status.catalogUpdatedAt).toLocaleString(zh ? "zh-CN" : "en-US")}</span>}
      </p>)}</div><Button variant="outline" className="min-h-11" disabled={pending.length > 0} onClick={() => onRetry(name)}>{pending.includes(name) ? (zh ? "加载中" : "Loading") : (zh ? "刷新目录" : "Refresh")}</Button>
    </div>)}
  </details>;
}
