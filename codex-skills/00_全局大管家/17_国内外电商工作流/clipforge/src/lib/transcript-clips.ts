import { DEFAULT_TRANSCRIPT_EDIT_PLAN, type TimeRange, type TranscriptDocument, type TranscriptEditPlan, type TranscriptWord } from "@/lib/transcript-editor";

export interface TranscriptClip {
  id: string;
  sourceRange: TimeRange;
  duration: number;
  text: string;
  firstWordId: string;
  lastWordId: string;
  wordCount: number;
  speechRatio: number;
  reasons: ("query" | "sentence" | "pause")[];
  plan: TranscriptEditPlan;
}

export interface TranscriptClipOptions {
  query?: string;
  targetSeconds?: number;
  limit?: number;
}

function searchable(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
}

function joinedText(words: TranscriptWord[]): string {
  const cjk = words.some((word) => /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(word.text));
  return words.map((word) => word.text).join(cjk ? "" : " ").replace(/\s+([,.!?;:])/g, "$1");
}

const sentenceEnd = /[.!?。！？；;…]["'”’）)]?$/u;

/** Deterministic suggestions from actual words, sentence endings and pauses. No model calls. */
export function suggestTranscriptClips(document: TranscriptDocument, options: TranscriptClipOptions = {}) {
  const targetSeconds = Number.isFinite(options.targetSeconds) ? Math.max(5, Math.min(120, options.targetSeconds!)) : 30;
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(12, Math.floor(options.limit!))) : 6;
  const query = (options.query ?? "").trim().slice(0, 160);
  const needle = searchable(query);
  const words = document.words.filter((word) => Number.isFinite(word.start) && Number.isFinite(word.end)
    && word.start >= 0 && word.end > word.start && word.end <= document.duration)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const units: { first: number; last: number; sentence: boolean; pause: boolean }[] = [];
  let first = 0;
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const next = words[index + 1];
    const sentence = sentenceEnd.test(word.text);
    const pause = !next || next.start - word.end >= 0.8;
    // Bound unpunctuated ASR runs by time, with word boundaries preserved.
    if (sentence || pause || word.end - words[first].start >= Math.min(8, targetSeconds) || index - first >= 80) {
      units.push({ first, last: index, sentence, pause });
      first = index + 1;
    }
  }

  const ranked: { clip: TranscriptClip; rank: number }[] = [];
  for (let i = 0; i < units.length; i++) {
    const startWord = words[units[i].first];
    let bestEnd = i;
    let bestDistance = Number.POSITIVE_INFINITY;
    // Find the nearest phrase boundary; do not bridge a long unattended stretch.
    for (let j = i; j < units.length; j++) {
      if (j > i && words[units[j].first].start - words[units[j - 1].last].end > 3) break;
      const length = words[units[j].last].end - startWord.start;
      const distance = Math.abs(length - targetSeconds);
      if (distance < bestDistance) { bestDistance = distance; bestEnd = j; }
      if (length >= targetSeconds * 1.35 || j - i >= 240) break;
    }
    const finalUnit = units[bestEnd];
    const lastWord = words[finalUnit.last];
    const clipWords = words.slice(units[i].first, finalUnit.last + 1);
    const text = joinedText(clipWords);
    if (needle && !searchable(text).includes(needle)) continue;
    if (lastWord.end - startWord.start < Math.min(3, targetSeconds * 0.4)) continue;

    // Breathing room is clipped to adjacent words, so it never includes another utterance.
    const previous = words[units[i].first - 1];
    const next = words[finalUnit.last + 1];
    const start = Math.max(0, startWord.start - 0.12, previous?.end ?? 0);
    const end = Math.min(document.duration, lastWord.end + 0.18, next?.start ?? document.duration);
    if (end - start < 0.5) continue;
    let speechSeconds = 0;
    let cursor = start;
    for (const word of clipWords) {
      speechSeconds += Math.max(0, Math.min(end, word.end) - Math.max(cursor, word.start));
      cursor = Math.max(cursor, word.end);
    }
    const duration = end - start;
    const speechRatio = Math.min(1, speechSeconds / duration);
    const sourceRange = { start, end };
    const reasons: TranscriptClip["reasons"] = [];
    if (needle) reasons.push("query");
    if (finalUnit.sentence) reasons.push("sentence");
    if (finalUnit.pause) reasons.push("pause");
    ranked.push({
      rank: speechRatio - Math.abs(duration - targetSeconds) / targetSeconds
        + (finalUnit.sentence ? 0.2 : 0) + (finalUnit.pause ? 0.1 : 0),
      clip: {
        id: `clip-${units[i].first}-${finalUnit.last}`,
        sourceRange, duration, text, firstWordId: startWord.id, lastWordId: lastWord.id,
        wordCount: clipWords.length, speechRatio, reasons,
        plan: { ...DEFAULT_TRANSCRIPT_EDIT_PLAN, removedWordIds: [], sourceRange },
      },
    });
  }
  ranked.sort((a, b) => b.rank - a.rank || a.clip.sourceRange.start - b.clip.sourceRange.start);
  const candidates: TranscriptClip[] = [];
  for (const { clip } of ranked) {
    if (candidates.some((other) => {
      const overlap = Math.max(0, Math.min(clip.sourceRange.end, other.sourceRange.end) - Math.max(clip.sourceRange.start, other.sourceRange.start));
      return overlap / Math.min(clip.duration, other.duration) > 0.5;
    })) continue;
    candidates.push(clip);
    if (candidates.length >= limit) break;
  }
  candidates.sort((a, b) => a.sourceRange.start - b.sourceRange.start);
  return { method: "local-transcript" as const, query, targetSeconds, candidates };
}
