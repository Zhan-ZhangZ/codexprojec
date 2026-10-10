/**
 * Roughly how long something takes, the way the Video page says it:
 * "~45 s", "~13 min", "~1 h 20 min", and ranges such as "~4–7 min". The
 * app's i18n has no plurals, so the units are abbreviations the caller
 * translates and passes in.
 */

export type DurationUnits = {
  /** Abbreviation for seconds, e.g. "s" / "с". */
  s: string
  /** Abbreviation for minutes, e.g. "min" / "мин". */
  min: string
  /** Abbreviation for hours, e.g. "h" / "ч". */
  h: string
}

type Parts =
  | { unit: 's'; value: number }
  | { unit: 'min'; value: number }
  | { unit: 'h'; hours: number; minutes: number }

/**
 * The rounded shape of `seconds`: seconds under a minute (to the nearest
 * five past ten), whole minutes under an hour, then hours and minutes to the
 * nearest five.
 */
function parts(seconds: number): Parts {
  const s = Math.max(Math.round(seconds), 1)
  if (s < 60)
    return {
      unit: 's',
      value: s < 10 ? s : Math.min(Math.round(s / 5) * 5, 55),
    }
  const minutes = Math.round(s / 60)
  if (minutes < 60) return { unit: 'min', value: minutes }
  const rounded = Math.round(s / 300) * 5
  return { unit: 'h', hours: Math.floor(rounded / 60), minutes: rounded % 60 }
}

function words(p: Parts, units: DurationUnits): string {
  if (p.unit === 's') return `${p.value} ${units.s}`
  if (p.unit === 'min') return `${p.value} ${units.min}`
  return p.minutes === 0
    ? `${p.hours} ${units.h}`
    : `${p.hours} ${units.h} ${p.minutes} ${units.min}`
}

/** "~45 s", "~13 min", "~1 h 20 min". */
export function formatDuration(seconds: number, units: DurationUnits): string {
  return `~${words(parts(seconds), units)}`
}

/**
 * "~4–7 min" when both ends read in the same unit; "~40 min – 2 h 40 min"
 * when they do not; a single "~7 min" when they round to the same thing.
 */
export function formatDurationRange(
  low: number,
  high: number,
  units: DurationUnits
): string {
  const a = parts(Math.min(low, high))
  const b = parts(Math.max(low, high))
  if (words(a, units) === words(b, units)) return `~${words(b, units)}`
  if (a.unit === b.unit && a.unit !== 'h' && b.unit !== 'h')
    return `~${a.value}–${b.value} ${units[a.unit]}`
  return `~${words(a, units)} – ${words(b, units)}`
}
