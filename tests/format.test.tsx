import { describe, expect, test } from 'vitest'
import { formatBytes, formatDate } from '../src/renderer/src/format'

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
})
