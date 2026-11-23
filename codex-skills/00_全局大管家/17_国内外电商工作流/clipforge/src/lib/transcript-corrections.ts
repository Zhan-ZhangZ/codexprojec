import type { TranscriptDocument, TranscriptWord } from "@/lib/transcript-editor";

export interface CaptionReplacement { wordIds: string[]; text: string }

export function validateCaptionReplacements(value: unknown, wordIds: Set<string>): CaptionReplacement[] {
  if (value === undefined) return [];
  const fail = () => { throw new RangeError("INVALID_CAPTION_REPLACEMENTS"); };
  if (!Array.isArray(value) || value.length > 200) return fail();
  const positions = new Map([...wordIds].map((id, index) => [id, index]));
  const used = new Set<string>();
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") return fail();
    const item = entry as Partial<CaptionReplacement>;
    if (typeof item.text !== "string" || !item.text.trim() || item.text.length > 240 || !Array.isArray(item.wordIds) || !item.wordIds.length || item.wordIds.length > 100) return fail();
    let previous = -1;
    for (const id of item.wordIds) {
      const position = positions.get(id);
      if (position === undefined || used.has(id) || (previous !== -1 && position !== previous + 1)) return fail();
      previous = position;
      used.add(id);
    }
    return { wordIds: [...item.wordIds], text: item.text.replace(/\s+/g, " ").trim() };
  });
}

/** Literal phrase matching, including phrases that span ASR word boundaries. */
export function findTranscriptPhrase(document: TranscriptDocument, query: string, limit = 200): { wordIds: string[]; text: string; start: number; end: number; from: number; to: number }[] {
  const needle = query.trim();
  if (!needle || needle.length > 160) return [];
  const separator = /^(zh|ja)/.test(document.language) || document.words.some((word) => /[\u3400-\u9fff\u3040-\u30ff]/.test(word.text)) ? "" : " ";
  const starts: number[] = [];
  const ends: number[] = [];
  let text = "";
  document.words.forEach((word, index) => {
    if (index) text += separator;
    starts.push(text.length); text += word.text; ends.push(text.length);
  });
  const results: ReturnType<typeof findTranscriptPhrase> = [];
  let offset = 0;
  let first = 0;
  while (results.length < limit) {
    const found = text.indexOf(needle, offset);
    if (found < 0) break;
    const end = found + needle.length;
    while (first < ends.length && ends[first] <= found) first++;
    let last = first;
    while (last + 1 < starts.length && starts[last + 1] < end) last++;
    if (first >= document.words.length) break;
    const words = document.words.slice(first, last + 1);
    results.push({ wordIds: words.map((word) => word.id), text: text.slice(starts[first], ends[last]), start: words[0].start, end: words.at(-1)!.end, from: found - starts[first], to: end - starts[first] });
    offset = end;
  }
  return results;
}

export function applyCaptionReplacements(words: TranscriptWord[], replacements: CaptionReplacement[] = []): TranscriptWord[] {
  const positions = new Map(words.map((word, index) => [word.id, index]));
  const applied = new Map<string, CaptionReplacement>();
  for (const replacement of replacements) {
    const first = positions.get(replacement.wordIds[0]);
    if (first === undefined || !replacement.wordIds.every((id, index) => words[first + index]?.id === id)) continue;
    applied.set(replacement.wordIds[0], replacement);
  }
  const out: TranscriptWord[] = [];
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const replacement = applied.get(word.id);
    if (!replacement) { out.push(word); continue; }
    const last = words[index + replacement.wordIds.length - 1];
    out.push({ ...word, text: replacement.text, end: last.end });
    index += replacement.wordIds.length - 1;
  }
  return out;
}
