/** User-facing BGM mix policy with safe bounds for speech-first short videos. */
export const DEFAULT_BGM_VOLUME = 0.18;
export const MIN_BGM_VOLUME = 0.05;
export const MAX_BGM_VOLUME = 0.4;

export function normalizeBgmVolume(value: unknown, fallback = DEFAULT_BGM_VOLUME): number {
  const parsed = typeof value === "number" ? value : Number(value);
  const base = Number.isFinite(parsed) ? parsed : fallback;
  const safe = Number.isFinite(base) ? base : DEFAULT_BGM_VOLUME;
  return Math.round(Math.min(MAX_BGM_VOLUME, Math.max(MIN_BGM_VOLUME, safe)) * 100) / 100;
}

export function resolveBgmMix(input: { volume?: unknown; duck?: unknown; hasVoice: boolean }) {
  return {
    volume: normalizeBgmVolume(input.volume),
    duck: input.hasVoice && input.duck !== false,
  };
}
