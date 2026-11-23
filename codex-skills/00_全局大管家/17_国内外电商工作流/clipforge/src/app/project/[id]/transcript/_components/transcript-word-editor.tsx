"use client";
import { memo, useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { findTranscriptPhrase } from "@/lib/transcript-corrections";
import type { TranscriptDocument, TranscriptEditPlan } from "@/lib/transcript-editor";

export const TRANSCRIPT_PAGE_WORDS = 160;
export const TranscriptWordEditor = memo(function TranscriptWordEditor({ document, plan, activeWordId, onToggle, onSeek }: {
  document: TranscriptDocument; plan: TranscriptEditPlan; activeWordId: string | null;
  onToggle: (id: string) => void; onSeek: (time: number) => void;
}) {
  const t = useT("transcript");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const matches = useMemo(() => findTranscriptPhrase(document, deferredQuery, 1000), [document, deferredQuery]);
  const positions = useMemo(() => new Map(document.words.map((word, index) => [word.id, index])), [document]);
  const removedIds = useMemo(() => new Set(plan.removedWordIds), [plan.removedWordIds]);
  const pages = Math.ceil(document.words.length / TRANSCRIPT_PAGE_WORDS);
  const match = matches[Math.min(matchIndex, Math.max(0, matches.length - 1))];
  const shownPage = deferredQuery.trim() && match ? Math.floor((positions.get(match.wordIds[0]) ?? 0) / TRANSCRIPT_PAGE_WORDS) : Math.min(page, pages - 1);
  const highlighted = new Set(match?.wordIds ?? []);
  const words = document.words.slice(shownPage * TRANSCRIPT_PAGE_WORDS, (shownPage + 1) * TRANSCRIPT_PAGE_WORDS);
  return <div>
    <div className="mb-3 flex flex-wrap gap-2">
      <input type="search" value={query} maxLength={160} placeholder={t("wordSearch")} aria-label={t("wordSearch")} onChange={(event) => { setQuery(event.target.value); setMatchIndex(0); }} className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
      <Button variant="outline" className="min-h-11" disabled={!activeWordId} onClick={() => { setQuery(""); setPage(Math.floor((positions.get(activeWordId!) ?? 0) / TRANSCRIPT_PAGE_WORDS)); }}>{t("locatePlaying")}</Button>
    </div>
    {deferredQuery.trim() && <div className="mb-3 flex flex-wrap items-center gap-2 text-xs" role="status">
      <span>{t("wordMatches", { n: matches.length, current: matches.length ? Math.min(matchIndex + 1, matches.length) : 0 })}</span>
      <Button variant="ghost" className="min-h-11" disabled={!matches.length || matchIndex === 0} onClick={() => setMatchIndex((value) => value - 1)}>{t("previous")}</Button>
      <Button variant="ghost" className="min-h-11" disabled={matchIndex >= matches.length - 1} onClick={() => setMatchIndex((value) => value + 1)}>{t("next")}</Button>
      <Button variant="outline" className="min-h-11" disabled={!match} onClick={() => { if (match) onSeek(match.start); }}>{t("clipsPreview")}</Button>
    </div>}
    <div className="max-h-[520px] overflow-y-auto rounded-xl border border-border/50 bg-background/30 p-3 leading-8 sm:p-4" aria-label={t("wordPageLabel")}>
      {words.map((word) => {
        const outside = !!plan.sourceRange && (word.end <= plan.sourceRange.start || word.start >= plan.sourceRange.end);
        const removed = removedIds.has(word.id) || outside;
        return <button key={word.id} type="button" disabled={outside} aria-pressed={removed} title={outside ? t("clipsOutside") : `${word.start.toFixed(2)}s – ${word.end.toFixed(2)}s`} onClick={() => onToggle(word.id)} className={`mr-1 min-h-11 rounded px-1.5 py-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary ${removed ? "bg-destructive/12 text-destructive line-through decoration-2" : "hover:bg-primary/10"} ${word.id === activeWordId ? "ring-2 ring-primary/70" : ""} ${highlighted.has(word.id) ? "bg-primary/15" : ""}`}>{word.text}</button>;
      })}
    </div>
    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <Button variant="outline" className="min-h-11" disabled={shownPage <= 0} onClick={() => { setQuery(""); setPage(shownPage - 1); }}>{t("previous")}</Button>
      <span>{t("wordPage", { page: shownPage + 1, total: pages, words: document.words.length })}</span>
      <Button variant="outline" className="min-h-11" disabled={shownPage >= pages - 1} onClick={() => { setQuery(""); setPage(shownPage + 1); }}>{t("next")}</Button>
    </div>
  </div>;
});
