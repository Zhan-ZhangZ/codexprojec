"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { LuPlay, LuSearch, LuScissors, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { suggestTranscriptClips } from "@/lib/transcript-clips";
import { validateTranscriptSourceRange, type TimeRange, type TranscriptDocument } from "@/lib/transcript-editor";

import { ClipBatch, type BatchClip } from "./clip-batch";
import type { TranscriptEditPlan } from "@/lib/transcript-editor";

function timecode(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

export function ClipWorkbench({ document, sourceRange, onPreview, onSelect, onClear, batch }: {
  batch: { projectId: string; mediaId: string; plan: TranscriptEditPlan; revision: number; disabled: boolean; onQueued: () => void };
  document: TranscriptDocument;
  sourceRange?: TimeRange;
  onPreview: (range: TimeRange) => void;
  onSelect: (range: TimeRange) => void;
  onClear: () => void;
}) {
  const [batchClips, setBatchClips] = useState<BatchClip[]>([]);
  const t = useT("transcript");
  const [query, setQuery] = useState("");
  const [targetSeconds, setTargetSeconds] = useState(30);
  const deferredQuery = useDeferredValue(query);
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [error, setError] = useState("");
  const { candidates } = useMemo(() => suggestTranscriptClips(document, {
    query: deferredQuery, targetSeconds, limit: 6,
  }), [document, deferredQuery, targetSeconds]);

  return <section className="mb-5 rounded-2xl border border-border/60 bg-card/55 p-4 sm:p-5" aria-labelledby="clip-workbench-title">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="clip-workbench-title" className="flex items-center gap-2 font-semibold"><LuScissors className="text-primary" aria-hidden="true" />{t("clipsTitle")}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t("clipsHint")}</p>
      </div>
      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{t("clipsLocal")}</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
      <label className="text-sm font-medium">{t("clipsSearch")}
        <span className="relative mt-1.5 block">
          <LuSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input type="search" maxLength={160} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("clipsSearchPlaceholder")} className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
        </span>
      </label>
      <label className="text-sm font-medium">{t("clipsTarget")}
        <select value={targetSeconds} onChange={(event) => setTargetSeconds(Number(event.target.value))} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {[15, 30, 60, 90].map((seconds) => <option key={seconds} value={seconds}>{t("clipsSeconds", { n: seconds })}</option>)}
        </select>
      </label>
    </div>
    {sourceRange && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <p className="text-sm font-medium">{t("clipsSelected", { start: timecode(sourceRange.start), end: timecode(sourceRange.end) })}</p>
      <Button variant="outline" className="min-h-11" onClick={onClear}><LuX />{t("clipsClear")}</Button>
    </div>}
    <p role="status" aria-live="polite" className="my-3 text-xs text-muted-foreground">{query !== deferredQuery ? t("clipsSearching") : t("clipsCount", { n: candidates.length })}</p>
    {candidates.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy={query !== deferredQuery}>
      {candidates.map((clip) => {
        const selected = sourceRange?.start === clip.sourceRange.start && sourceRange?.end === clip.sourceRange.end;
        return <article key={clip.id} className={`flex min-w-0 flex-col rounded-xl border p-4 ${selected ? "border-primary/40 bg-primary/5" : "border-border/60 bg-background/30"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-muted-foreground">
            <span>{timecode(clip.sourceRange.start)} – {timecode(clip.sourceRange.end)}</span>
            <span>{t("clipsSeconds", { n: clip.duration.toFixed(1) })}</span>
          </div>
          <p className="mt-3 line-clamp-3 break-words text-sm leading-6">{clip.text}</p>
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="min-h-8 cursor-pointer rounded py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t("clipsRead")}</summary>
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words py-2 text-sm leading-6 text-foreground">{clip.text}</p>
          </details>
          <div className="my-3 flex flex-wrap gap-2">
            {clip.reasons.map((reason) => <span key={reason} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{t(`clipsReason_${reason}`)}</span>)}
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11 flex-1" onClick={() => onPreview(clip.sourceRange)}><LuPlay />{t("clipsPreview")}</Button>
            <Button variant={selected ? "secondary" : "default"} className="min-h-11 flex-1" aria-pressed={selected} onClick={() => onSelect(clip.sourceRange)}>{selected ? t("clipsAdopted") : t("clipsUse")}</Button>
          </div>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-xs"><input type="checkbox" className="h-4 w-4 accent-primary" checked={batchClips.some((item) => item.id === clip.id)} disabled={batch.disabled || (batchClips.length >= 12 && !batchClips.some((item) => item.id === clip.id))} onChange={(event) => setBatchClips((items) => event.target.checked ? [...items, { id: clip.id, label: clip.text.slice(0, 40), sourceRange: clip.sourceRange }] : items.filter((item) => item.id !== clip.id))} />{t("batchSelect")}</label>
        </article>;
      })}
    </div> : <p className="rounded-xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">{query.trim() ? t("clipsEmptySearch") : t("clipsEmpty")}</p>}
    <ClipBatch {...batch} clips={batchClips} onChange={setBatchClips} />
    <details className="mt-4 border-t border-border/50 pt-3">
      <summary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t("clipsManual")}</summary>
      <form className="mt-2 flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault();
        try {
          if (!manualStart.trim() || !manualEnd.trim()) throw new Error();
          const range = validateTranscriptSourceRange({ start: Number(manualStart), end: Number(manualEnd) }, document.duration);
          if (range.end - range.start < 0.5) throw new Error();
          onSelect(range);
          setError("");
        } catch { setError(t("clipsInvalid", { n: document.duration.toFixed(1) })); }
      }}>
        <label className="min-w-0 flex-1 text-sm">{t("clipsStart")}<input required type="number" min={0} max={document.duration} step="any" value={manualStart} onChange={(event) => setManualStart(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>
        <label className="min-w-0 flex-1 text-sm">{t("clipsEnd")}<input required type="number" min={0} max={document.duration} step="any" value={manualEnd} onChange={(event) => setManualEnd(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>
        <Button type="submit" variant="outline" className="min-h-11">{t("clipsUse")}</Button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </details>
  </section>;
}
