/**
 * How the Video page words the core's estimate: gigabytes as a person reads
 * them off their Mac, the duration units in the user's language, the
 * "needs … of …" sentence of the confirmation, and
 * the seconds left for a running clip.
 */

import type { DurationUnits } from '@/lib/video/format-duration'
import type { VideoEstimate, VideoJob } from '@/services/diffusion/types'

/** The `t` of `useTranslation`, as these helpers need it. */
type Translation = (key: string, values?: Record<string, unknown>) => string

const GIB = 1024 ** 3

/** Bytes as the gigabytes a person reads off their Mac's "16 GB": one decimal. */
export function formatGigabytes(bytes: number): string {
  return (Math.round((bytes / GIB) * 10) / 10).toFixed(1)
}

/** The translated abbreviations the duration formatter takes. */
export function durationUnits(t: Translation): DurationUnits {
  return {
    s: t('videos:estimate.units.s'),
    min: t('videos:estimate.units.min'),
    h: t('videos:estimate.units.h'),
  }
}

/** "Needs ~27.3 GB of memory, 13.6 GB available." — the confirmation's first line. */
export function exceedsSentence(
  estimate: VideoEstimate,
  t: Translation
): string {
  return t('videos:estimate.exceeds', {
    required: formatGigabytes(estimate.memory.requiredBytes),
    available: formatGigabytes(estimate.memory.budgetBytes),
  })
}

/**
 * Seconds left for the clip. The core's `etaSeconds` covers the whole job
 * once it reports; before its first progress (or from an older core that
 * sends none yet) the job's estimate stands in, less the time already spent.
 * Once sampling started the core's word is final, null included.
 */
export function remainingSeconds(
  job: VideoJob,
  nowMs: number,
  startedAtMs: number
): number | null {
  const progress = job.progress
  if (progress?.etaSeconds != null)
    return progress.etaSeconds > 0 ? progress.etaSeconds : null
  if (progress && progress.phase !== 'queued' && progress.phase !== 'encoding')
    return null
  const seconds = job.estimate?.seconds
  if (!seconds) return null
  // The middle of the core's range: the range is symmetric around it on a log scale.
  const middle = Math.sqrt(seconds.low * seconds.high)
  const elapsedMs =
    progress?.elapsedMs ??
    (startedAtMs > 0 ? Math.max(nowMs - startedAtMs, 0) : 0)
  const left = middle - elapsedMs / 1000
  return left > 0 ? left : null
}
