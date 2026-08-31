import { describe, expect, test } from 'vitest'
import {
  formatBitRate,
  formatBytes,
  formatDate,
  formatDuration,
  formatFrameRate,
  formatSampleRate
} from '../src/renderer/src/format'

describe('formateo visible', () => {
  test('formatea bytes en todas las unidades soportadas', () => {
    expect(formatBytes(12)).toBe('12 B')
    expect(formatBytes(1_536)).toBe('1.5 KB')
    expect(formatBytes(2_621_440)).toBe('2.5 MB')
    expect(formatBytes(1_610_612_736)).toBe('1.5 GB')
  })

  test('formatea la fecha con locale argentino', () => {
    expect(formatDate('2026-08-29T13:00:00.000Z')).toMatch(/29.*ago.*2026/u)
  })

  test('formatea metadata multimedia compacta', () => {
    expect(formatDuration(62.4)).toBe('1:02')
    expect(formatDuration(3_661)).toBe('1:01:01')
    expect(formatDuration(-2)).toBe('0:00')
    expect(formatBitRate(256_000)).toBe('256 kb/s')
    expect(formatBitRate(8_000_000)).toBe('8 Mb/s')
    expect(formatBitRate(8_250_000)).toBe('8.25 Mb/s')
    expect(formatFrameRate(30)).toBe('30 FPS')
    expect(formatFrameRate(29.97)).toBe('29.97 FPS')
    expect(formatSampleRate(48_000)).toBe('48 kHz')
    expect(formatSampleRate(44_100)).toBe('44.1 kHz')
  })
})
