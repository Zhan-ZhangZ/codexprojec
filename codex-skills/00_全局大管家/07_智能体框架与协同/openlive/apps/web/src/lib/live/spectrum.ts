// Fold an AnalyserNode's byte frequency data into N log-spaced ("octave") bands,
// each 0..1 — the raw material for a real, reactive voice waveform on the orb.
// Only the lower ~half of the bins carry voice energy, so we ignore the top.
export function octaveBands(freq: Uint8Array, n: number): number[] {
  const out = new Array(n).fill(0);
  const maxBin = Math.max(n + 1, Math.floor(freq.length * 0.55));
  let prev = 1;
  for (let b = 0; b < n; b++) {
    const next = Math.max(prev + 1, Math.round(Math.pow(maxBin, (b + 1) / n)));
    let sum = 0, cnt = 0;
    for (let i = prev; i < next && i < freq.length; i++) { sum += freq[i]!; cnt++; }
    out[b] = cnt ? sum / cnt / 255 : 0;
    prev = next;
  }
  return out;
}
