import { afterEach, describe, expect, it } from 'vitest'
import { formatLogTime } from '../log-time'

const originalTz = process.env.TZ

afterEach(() => {
  process.env.TZ = originalTz
})

describe('formatLogTime', () => {
  it('gives the same string in UTC and in Europe/Moscow', () => {
    process.env.TZ = 'UTC'
    const inUtc = [formatLogTime('2026-09-28T12:00:05Z'), formatLogTime(0)]
    process.env.TZ = 'Europe/Moscow'
    const inMoscow = [formatLogTime('2026-09-28T12:00:05Z'), formatLogTime(0)]

    expect(inMoscow).toEqual(inUtc)
    expect(inMoscow).toEqual([
      '2026-09-28 12:00:05 UTC',
      '1970-01-01 00:00:00 UTC',
    ])
  })

  it('matches the date and time of the file header it came from', () => {
    const header = '[2026-09-28][23:59:59][app_lib::core][INFO] message'
    const [, date, time] = /^\[(.+?)\]\[(.+?)\]/.exec(header)!

    expect(formatLogTime(`${date}T${time}Z`)).toBe(`${date} ${time} UTC`)
  })

  it('drops milliseconds rather than rounding them', () => {
    expect(formatLogTime('2026-09-28T12:00:05.999Z')).toBe(
      '2026-09-28 12:00:05 UTC'
    )
    expect(formatLogTime(Date.UTC(2026, 8, 28, 12, 0, 5, 999))).toBe(
      '2026-09-28 12:00:05 UTC'
    )
  })

  it('returns text it cannot read as a time unchanged', () => {
    expect(formatLogTime('not a time')).toBe('not a time')
  })
})
