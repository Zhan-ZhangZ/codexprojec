export function normalizeAsrText(text) {
  return String(text).normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "");
}
export function characterErrorRate(reference, hypothesis) {
  const expected = [...normalizeAsrText(reference)];
  const actual = [...normalizeAsrText(hypothesis)];
  if (!expected.length) throw new Error("ASR evaluation reference must contain text");
  let previous = Array.from({ length: actual.length + 1 }, (_, i) => i);
  for (let i = 1; i <= expected.length; i++) {
    const row = [i];
    for (let j = 1; j <= actual.length; j++) row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (expected[i - 1] === actual[j - 1] ? 0 : 1));
    previous = row;
  }
  return { errors: previous[actual.length], characters: expected.length, cer: previous[actual.length] / expected.length };
}
export function timestampQuality(chunks, duration) {
  let previousStart = -1;
  let valid = 0;
  for (const chunk of chunks ?? []) {
    const [start, end] = chunk.timestamp ?? [];
    if (typeof start === "number" && typeof end === "number" && Number.isFinite(start) && Number.isFinite(end) && start >= previousStart && start >= 0 && end > start && end <= duration + 0.1) valid++;
    if (typeof start === "number" && Number.isFinite(start)) previousStart = start;
  }
  return { chunks: chunks?.length ?? 0, valid, validRatio: chunks?.length ? valid / chunks.length : 0 };
}
