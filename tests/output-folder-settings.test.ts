import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { OutputFolderSettings } from '../src/main/outputFolderSettings'

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'desofuscador-videos-settings-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('configuracion de carpeta de salida', () => {
  test('usa el destino inicial si todavia no existe configuracion', async () => {
    const root = await temporaryDirectory()
    const fallback = join(root, 'Videos', 'Cortos')
    const settings = new OutputFolderSettings(join(root, 'config', 'output-settings.json'), fallback)

    await expect(settings.get()).resolves.toBe(fallback)
  })

  test('crea, persiste y recupera una carpeta elegida', async () => {
    const root = await temporaryDirectory()
    const settingsFile = join(root, 'config', 'output-settings.json')
    const selected = join(root, 'salida personalizada')
    const settings = new OutputFolderSettings(settingsFile, join(root, 'Videos', 'Cortos'))

    await expect(settings.set(selected)).resolves.toBe(selected)
    await expect(new OutputFolderSettings(settingsFile, join(root, 'otra')).get()).resolves.toBe(selected)
    await expect(readFile(settingsFile, 'utf8')).resolves.toContain(selected.replaceAll('\\', '\\\\'))
  })

  test('ignora configuraciones corruptas, relativas o con forma inesperada', async () => {
    const root = await temporaryDirectory()
    const settingsFile = join(root, 'config', 'output-settings.json')
    const fallback = join(root, 'Videos', 'Cortos')
    const settings = new OutputFolderSettings(settingsFile, fallback)
    await mkdir(dirname(settingsFile), { recursive: true })

    for (const invalid of ['{', 'null', '42', '[]', '{}', '{"outputFolder":"relativa"}']) {
      await writeFile(settingsFile, invalid, 'utf8')
      await expect(settings.get()).resolves.toBe(fallback)
    }
  })

  test('rechaza rutas relativas y propaga errores de lectura reales', async () => {
    const root = await temporaryDirectory()
    expect(() => new OutputFolderSettings('relativa.json', root)).toThrow(/absolutas/i)
    expect(() => new OutputFolderSettings(join(root, 'config.json'), 'relativa')).toThrow(/absolutas/i)

    const settings = new OutputFolderSettings(root, join(root, 'Videos', 'Cortos'))
    await expect(settings.get()).rejects.toBeTruthy()
    await expect(settings.set('relativa')).rejects.toThrow(/absoluta/i)
  })
})
