// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

test('compila y prueba el lector MP4 y el detector real en Windows PowerShell', () => {
  const output = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', resolve('tests/run-bdve-regression.ps1')],
    { encoding: 'utf8', windowsHide: true, timeout: 20_000 }
  )
  expect(output).toContain('BDVE regression OK:')
}, 25_000)

test('el script devuelve un error identificable sin crear una salida cuando falta la entrada', () => {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      resolve('resources/Desofuscar-Video.ps1'),
      '-InputPath',
      resolve('tests/no-existe-entrada.mp4')
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 10_000 }
  )
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('BDVE_ERROR:')
  expect(result.stdout).not.toContain('Listo:')
}, 15_000)
