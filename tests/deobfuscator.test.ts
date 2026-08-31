import type { ChildProcess } from 'node:child_process'
import { describe, expect, test, vi } from 'vitest'
import {
  BdveDeobfuscator,
  deobfuscationError,
  nextAvailableOutputPath,
  normalizeOutputName,
  resolveOutputFolder,
  suggestedOutputName,
  type DeobfuscatorOptions,
  type ToolCallback,
  type ToolExecutor
} from '../src/main/deobfuscator'

function processStub(): ChildProcess {
  return { pid: 41, kill: vi.fn(() => true) } as unknown as ChildProcess
}

function options(execute: ToolExecutor, terminate = vi.fn()): DeobfuscatorOptions {
  return {
    powerShellPath: 'C:\\Windows\\powershell.exe',
    scriptPath: 'C:\\app\\Desofuscar-Video.ps1',
    ffprobePath: 'C:\\app\\ffprobe.exe',
    execute,
    terminate
  }
}

describe('ejecucion del detector BDVE', () => {
  test('genera un nombre de salida estable con o sin extension', () => {
    expect(suggestedOutputName('C:\\cache\\clip.mp4')).toBe('clip_desofuscado.mp4')
    expect(suggestedOutputName('clip')).toBe('clip_desofuscado.mp4')
  })

  test('resuelve Cortos bajo Videos y admite un destino configurado', () => {
    expect(resolveOutputFolder('C:\\Users\\persona')).toBe('C:\\Users\\persona\\Videos\\Cortos')
    expect(resolveOutputFolder('C:\\Users\\persona', '  C:\\Pruebas\\Salida  ')).toBe('C:\\Pruebas\\Salida')
  })

  test('normaliza el nombre opcional y agrega MP4 cuando falta', () => {
    expect(normalizeOutputName('C:\\cache\\clip.mp4', undefined)).toBe('clip_desofuscado.mp4')
    expect(normalizeOutputName('clip.mp4', '  corto final  ')).toBe('corto final.mp4')
    expect(normalizeOutputName('clip.mp4', 'corto.MP4')).toBe('corto.MP4')
  })

  test('rechaza nombres que Windows no puede crear', () => {
    expect(() => normalizeOutputName('clip.mp4', 7)).toThrow('no es valido')
    expect(() => normalizeOutputName('clip.mp4', 'a'.repeat(181))).toThrow('180')
    expect(() => normalizeOutputName('clip.mp4', 'carpeta\\video')).toThrow('caracteres')
    expect(() => normalizeOutputName('clip.mp4', 'video\nnuevo')).toThrow('caracteres')
    expect(() => normalizeOutputName('clip.mp4', 'video.')).toThrow('caracteres')
    expect(() => normalizeOutputName('clip.mp4', 'video.mov')).toThrow('.mp4')
    expect(() => normalizeOutputName('clip.mp4', 'CON')).toThrow('reservado')
    expect(() => normalizeOutputName('clip.mp4', '.mp4')).toThrow('reservado')
  })

  test('elige un nombre libre sin sobrescribir salidas anteriores', async () => {
    const exists = vi
      .fn<(path: string) => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    await expect(nextAvailableOutputPath('C:\\Videos\\Cortos', 'mi-video.mp4', exists)).resolves.toBe(
      'C:\\Videos\\Cortos\\mi-video (3).mp4'
    )
    await expect(nextAvailableOutputPath('C:\\Videos\\Cortos', 'libre.mp4', async () => false)).resolves.toBe(
      'C:\\Videos\\Cortos\\libre.mp4'
    )
  })

  test('informa cuando no quedan nombres anticolision disponibles', async () => {
    await expect(nextAvailableOutputPath('C:\\Videos\\Cortos', 'ocupado.mp4', async () => true)).rejects.toThrow(
      'disponible'
    )
  })

  test('extrae un error util de stderr, stdout o del proceso', () => {
    const failure = new Error('exit 1')
    expect(deobfuscationError(failure, 'otra salida', 'At script.ps1:1\nNo se encontro CapCut')).toHaveProperty(
      'message',
      'No se encontro CapCut'
    )
    expect(deobfuscationError(failure, 'La cabecera no es BDVE', 'CategoryInfo: control')).toHaveProperty(
      'message',
      'La cabecera no es BDVE'
    )
    expect(deobfuscationError(failure, '+ control\n   ~~~~', 'FullyQualifiedErrorId: control')).toHaveProperty(
      'message',
      'No se pudo desofuscar el video: exit 1'
    )
  })

  test('invoca PowerShell oculto con rutas separadas y bloquea una segunda ejecucion', async () => {
    let callback: ToolCallback | undefined
    const child = processStub()
    const execute = vi.fn<ToolExecutor>((_file, _arguments, _options, next) => {
      callback = next
      return child
    })
    const deobfuscator = new BdveDeobfuscator(options(execute))

    const pending = deobfuscator.run('C:\\cache\\clip.mp4', 'C:\\Videos\\clip_limpio.mp4')
    expect(deobfuscator.isRunning).toBe(true)
    await expect(deobfuscator.run('otro.mp4', 'otro-limpio.mp4')).rejects.toThrow('en curso')
    expect(execute).toHaveBeenCalledWith(
      'C:\\Windows\\powershell.exe',
      expect.arrayContaining([
        '-File',
        'C:\\app\\Desofuscar-Video.ps1',
        '-InputPath',
        'C:\\cache\\clip.mp4',
        '-OutputPath',
        'C:\\Videos\\clip_limpio.mp4',
        '-FfprobePath',
        'C:\\app\\ffprobe.exe'
      ]),
      { windowsHide: true, timeout: 600_000, maxBuffer: 4_194_304 },
      expect.any(Function)
    )
    callback?.(null, 'Listo', '')
    await pending
    expect(deobfuscator.isRunning).toBe(false)
  })

  test('propaga errores normalizados y errores sin proceso hijo', async () => {
    let callback: ToolCallback | undefined
    const execute: ToolExecutor = (_file, _arguments, _options, next) => {
      callback = next
      return processStub()
    }
    const failed = new BdveDeobfuscator(options(execute)).run('entrada.mp4', 'salida.mp4')
    callback?.(new Error('exit 1'), '', 'El video es demasiado corto')
    await expect(failed).rejects.toThrow('demasiado corto')

    const thrown = new Error('PowerShell no disponible')
    const throwing: ToolExecutor = () => {
      throw thrown
    }
    await expect(new BdveDeobfuscator(options(throwing)).run('entrada.mp4', 'salida.mp4')).rejects.toBe(thrown)
  })

  test('cancela solamente el proceso activo', async () => {
    let callback: ToolCallback | undefined
    const child = processStub()
    const terminate = vi.fn()
    const execute: ToolExecutor = (_file, _arguments, _options, next) => {
      callback = next
      return child
    }
    const deobfuscator = new BdveDeobfuscator(options(execute, terminate))

    deobfuscator.cancel()
    expect(terminate).not.toHaveBeenCalled()
    const pending = deobfuscator.run('entrada.mp4', 'salida.mp4')
    deobfuscator.cancel()
    expect(terminate).toHaveBeenCalledWith(child)
    expect(deobfuscator.isRunning).toBe(false)
    callback?.(null, '', '')
    await pending
  })
})
