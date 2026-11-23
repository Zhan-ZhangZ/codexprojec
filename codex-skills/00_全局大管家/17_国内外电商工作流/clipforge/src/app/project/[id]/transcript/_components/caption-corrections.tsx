"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { findTranscriptPhrase, validateCaptionReplacements } from "@/lib/transcript-corrections";
import type { TranscriptDocument, TranscriptEditPlan } from "@/lib/transcript-editor";

export function CaptionCorrections({ document, plan, onChange }: { document: TranscriptDocument; plan: TranscriptEditPlan; onChange: (plan: TranscriptEditPlan) => void }) {
  const t = useT("transcript");
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [error, setError] = useState("");
  const matches = useMemo(() => findTranscriptPhrase(document, query), [document, query]);
  const corrections = plan.captionReplacements ?? [];
  return <details className="mt-4 rounded-xl border border-border/60 bg-background/30 p-3">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">{t("correctionsTitle", { n: corrections.length })}</summary>
    <p className="text-xs leading-5 text-muted-foreground">{t("correctionsHint")}</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="text-xs">{t("correctionsFind")}<input value={query} maxLength={160} onChange={(event) => { setQuery(event.target.value); setError(""); }} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
      <label className="text-xs">{t("correctionsReplace")}<input value={replacement} maxLength={160} onChange={(event) => { setReplacement(event.target.value); setError(""); }} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
    </div>
    {query.trim() && <div className="mt-2 text-xs text-muted-foreground" role="status"><p>{t("correctionsMatches", { n: matches.length })}</p>{matches.slice(0, 3).map((match, index) => <p key={index} className="mt-1 break-words">{match.start.toFixed(1)}s · {match.text} → {match.text.slice(0, match.from)}{replacement}{match.text.slice(match.to)}</p>)}</div>}
    <Button variant="outline" className="mt-3 min-h-11" disabled={!matches.length || !replacement.trim()} onClick={() => {
      try {
        // Multiple literal occurrences within one ASR token are grouped before validation.
        const grouped = new Map<string, { wordIds: string[]; text: string; spans: typeof matches }>();
        for (const match of matches) {
          const key = match.wordIds.join("\0");
          const group = grouped.get(key) ?? { wordIds: match.wordIds, text: match.text, spans: [] };
          group.spans.push(match); grouped.set(key, group);
        }
        const next = [...grouped.values()].map((group) => {
          let text = group.text;
          for (const span of [...group.spans].reverse()) text = text.slice(0, span.from) + replacement.trim() + text.slice(span.to);
          return { wordIds: group.wordIds, text };
        });
        const newIds = new Set(next.flatMap((entry) => entry.wordIds));
        const retained = corrections.filter((entry) => !entry.wordIds.some((id) => newIds.has(id)));
        const validated = validateCaptionReplacements([...retained, ...next], new Set(document.words.map((word) => word.id)));
        onChange({ ...plan, captionReplacements: validated }); setError("");
      } catch { setError(t("correctionsInvalid")); }
    }}>{t("correctionsApply")}</Button>
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    {corrections.length > 0 && <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">{corrections.map((entry, index) => <div key={entry.wordIds.join(":")} className="flex items-center justify-between gap-2 text-xs"><span className="break-words">{entry.text}</span><Button variant="ghost" className="min-h-11 shrink-0" onClick={() => onChange({ ...plan, captionReplacements: corrections.filter((_, i) => i !== index) })}>{t("correctionsRemove")}</Button></div>)}</div>}
  </details>;
}
