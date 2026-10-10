import { describe, expect, it } from 'vitest'

import { formatDuration, formatDurationRange } from '../format-duration'

const RU = { s: 'с', min: 'мин', h: 'ч' }
const EN = { s: 's', min: 'min', h: 'h' }

describe('formatDuration', () => {
  it.each([
    [0, '~1 с'],
    [7, '~7 с'],
    [44, '~45 с'],
    [58, '~55 с'],
    [60, '~1 мин'],
    [750, '~13 мин'],
    [3569, '~59 мин'],
    [3600, '~1 ч'],
    [4800, '~1 ч 20 мин'],
    [4790, '~1 ч 20 мин'],
    [9000, '~2 ч 30 мин'],
  ] as const)('%i s reads %s', (seconds, text) => {
    expect(formatDuration(seconds, RU)).toBe(text)
  })

  it('takes the units it is given', () => {
    expect(formatDuration(4800, EN)).toBe('~1 h 20 min')
  })
})

describe('formatDurationRange', () => {
  it('shares the unit when both ends read in it', () => {
    expect(formatDurationRange(240, 420, RU)).toBe('~4–7 мин')
    expect(formatDurationRange(20, 45, RU)).toBe('~20–45 с')
  })

  it('spells both ends when their units differ, and orders them', () => {
    expect(formatDurationRange(9600, 2400, RU)).toBe('~40 мин – 2 ч 40 мин')
    expect(formatDurationRange(45, 150, EN)).toBe('~45 s – 3 min')
    expect(formatDurationRange(3600, 7200, EN)).toBe('~1 h – 2 h')
  })

  it('reads as one value when both ends round alike', () => {
    expect(formatDurationRange(400, 430, RU)).toBe('~7 мин')
  })
})
