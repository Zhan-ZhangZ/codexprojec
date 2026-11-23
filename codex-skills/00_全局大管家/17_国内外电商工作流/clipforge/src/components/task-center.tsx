"use client";

import { useRouter } from "next/navigation";
import { useT, useLocale } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/relative-time";
import { useTaskFeed } from "@/lib/hooks/use-task-feed";
import { taskHref, type TaskRow } from "@/lib/task-feed";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/** 跨项目任务状态与恢复入口。 */
export function TaskCenter({ collapsed = false }: { collapsed?: boolean }) {
  const t = useT("common");
  const locale = useLocale();
  const router = useRouter();
  const { feed, loading, error, updatedAt, refresh } = useTaskFeed();

  const badgeCount = feed.active.length + feed.attention.length;

  const rowTitle = (row: TaskRow): string => {
    switch (row.kind) {
      case "transcript":
        return t("taskKindTranscript", { revision: row.revision ?? 0, progress: row.progress ?? 0 });
      case "transcript_failed":
        return t("taskKindTranscriptFailed", { revision: row.revision ?? 0 });
      case "pipeline":
        return t("taskKindPipeline", {
          stage: t(row.stage === "judge" ? "taskStageJudge" : row.stage === "stock_fill" ? "taskStageAssets" : "taskStageCompose"),
        });
      case "pipeline_interrupted":
        return t("taskKindInterrupted");
      case "pipeline_failed":
        return t("taskKindFailed");
      case "compose":
        return t("taskKindCompose");
      case "paid":
        return t("taskKindPaid", { model: row.model ?? "" });
      case "paid_unknown":
        return t("taskKindPaidUnknown");
      case "batch":
        return t("taskKindBatch", { done: row.done ?? 0, total: row.total ?? 0 });
      case "done":
        return t("taskKindDone");
      default:
        return row.kind;
    }
  };

  const renderRow = (row: TaskRow, tone: "active" | "attention" | "recent") => (
    <DropdownMenuItem
      key={`${row.kind}-${row.id}`}
      onClick={() => router.push(taskHref(row))}
      className={`flex min-h-11 w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/50 ${
        tone === "attention" ? "border border-amber-500/40 bg-amber-500/10" : ""
      }`}
    >
      <span className={`flex items-center gap-1.5 text-xs font-medium ${tone === "attention" ? "text-amber-500" : ""}`}>
        {tone === "active" && (
          <svg aria-hidden="true" className="h-3 w-3 animate-spin motion-reduce:animate-none text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
        )}
        {tone === "attention" && <span aria-hidden>⚠️</span>}
        <span className="min-w-0 truncate">{rowTitle(row)}</span>
      </span>
      <span className="w-full truncate text-[11px] text-muted-foreground">
        {[row.projectName || row.label, formatRelativeTime(row.createdAt ?? null, locale)].filter(Boolean).join(" · ")}
      </span>
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) refresh(); }}>
      <DropdownMenuTrigger
        aria-label={badgeCount ? `${t("taskCenter")} · ${badgeCount}` : t("taskCenter")}
        title={t("taskCenter")}
        className={`relative flex items-center gap-2.5 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground ${
          collapsed ? "h-11 w-11 justify-center" : "min-h-11 w-full px-3 py-2"
        }`}
      >
        <span className="relative shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {badgeCount > 0 && (
            <span
              className={`absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white ${
                feed.attention.length > 0 ? "bg-amber-500" : "bg-primary"
              }`}
            >
              {badgeCount}
            </span>
          )}
        </span>
        {!collapsed && t("taskCenter")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1rem)] p-2">
        <div className="mb-2 flex items-center justify-between gap-2 border-b pb-1">
          <p role="status" className="min-w-0 text-[11px] text-muted-foreground">
            {loading ? t("taskRefreshing") : updatedAt ? t("taskUpdated", { time: formatRelativeTime(new Date(updatedAt).toISOString(), locale) }) : t("taskCenter")}
          </p>
          <DropdownMenuItem closeOnClick={false} disabled={loading} onClick={refresh} className="min-h-11 shrink-0 px-2 text-xs">
            {error ? t("retry") : t("taskRefresh")}
          </DropdownMenuItem>
        </div>
        {error && <p role="alert" className="mb-2 rounded-md bg-amber-500/10 px-2 py-2 text-xs text-amber-700 dark:text-amber-400">{t(updatedAt ? "taskRefreshStale" : "taskRefreshFailed")}</p>}
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {feed.attention.length > 0 && (
            <div className="space-y-1">
              <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-amber-500/80">{t("taskAttention")}</p>
              {feed.attention.map((r) => renderRow(r, "attention"))}
            </div>
          )}
          {feed.active.length > 0 && (
            <div className="space-y-1">
              <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">{t("taskActive")}</p>
              {feed.active.map((r) => renderRow(r, "active"))}
            </div>
          )}
          {feed.recent.length > 0 && (
            <div className="space-y-1">
              <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">{t("taskRecent")}</p>
              {feed.recent.map((r) => renderRow(r, "recent"))}
            </div>
          )}
          {!loading && !error && badgeCount === 0 && feed.recent.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("taskCenterEmpty")}</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
