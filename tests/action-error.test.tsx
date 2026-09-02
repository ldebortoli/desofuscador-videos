import { expect, test } from 'vitest'
import { formatActionError } from '../src/renderer/src/format'

test('muestra la causa sin el envoltorio interno de Electron', () => {
  expect(
    formatActionError(
      new Error("Error invoking remote method 'inspector:deobfuscate': Error: Indice no compatible"),
      'Fallo'
    )
  ).toBe('Indice no compatible')
  expect(formatActionError(new Error("Error invoking remote method 'inspector:deobfuscate': Sin audio"), 'Fallo')).toBe(
    'Sin audio'
  )
  expect(formatActionError(new Error('Falta CapCut'), 'Fallo')).toBe('Falta CapCut')
  expect(formatActionError(new Error(''), 'Fallo')).toBe('Fallo')
  expect(formatActionError(null, 'Fallo')).toBe('Fallo')
})
