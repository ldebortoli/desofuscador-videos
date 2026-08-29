import { dirname, join } from 'node:path'
import { mkdir, mkdtemp, realpath, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { CapCutInspector, type InspectorDirectoryEntry, type InspectorFileSystem } from '../src/main/capcutInspector'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function makeInspector(): Promise<{ inspector: CapCutInspector; root: string }> {
  const root = await mkdtemp(join(tmpdir(), 'clip-cache-inspector-'))
  temporaryDirectories.push(root)
  return { inspector: new CapCutInspector(root), root }
}

async function makeFile(path: string, content = 'video-control', modifiedAt = new Date()): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
  await utimes(path, modifiedAt, modifiedAt)
}

function entry(name: string, kind: 'directory' | 'file' | 'symlink'): InspectorDirectoryEntry {
  return {
    name,
    isDirectory: () => kind === 'directory',
    isFile: () => kind === 'file',
    isSymbolicLink: () => kind === 'symlink'
  }
}

function fileSystem(overrides: Partial<InspectorFileSystem> = {}): InspectorFileSystem {
  return {
    readDirectory: async () => [],
    realPath: async (path) => path,
    fileDetails: async () => ({ mtime: new Date('2026-08-29T13:00:00.000Z'), size: 10, isFile: () => true }),
    ...overrides
  }
}

describe('deteccion segura de archivos CapCut', () => {
  test('exige LOCALAPPDATA y representa las tres ubicaciones ausentes', async () => {
    expect(() => new CapCutInspector(' ')).toThrow('LOCALAPPDATA')
    const originalLocalAppData = process.env['LOCALAPPDATA']
    process.env['LOCALAPPDATA'] = 'C:\\Temp\\CapCut-test'
    expect(new CapCutInspector().locations).toHaveLength(3)
    delete process.env['LOCALAPPDATA']
    expect(() => new CapCutInspector()).toThrow('LOCALAPPDATA')
    if (originalLocalAppData) process.env['LOCALAPPDATA'] = originalLocalAppData
    const { inspector } = await makeInspector()

    const result = await inspector.scan()

    expect(result.file).toBeNull()
    expect(result.locations).toHaveLength(3)
    expect(result.locations.every((location) => !location.available)).toBe(true)
  })

  test('propaga errores de acceso en raices y proyectos sin ocultarlos', async () => {
    const denied = Object.assign(new Error('Acceso denegado'), { code: 'EACCES' })
    let projectRoot = ''
    const fake = fileSystem({
      readDirectory: vi.fn(async (path) => {
        if (path === projectRoot)
          return [entry('nota.txt', 'file'), entry('enlace', 'symlink'), entry('draft', 'directory')]
        if (path.endsWith(join('draft', 'Resources', 'combination'))) throw denied
        return []
      })
    })
    const inspector = new CapCutInspector('C:\\Local', fake)
    projectRoot = inspector.locations[0]?.path ?? ''

    await expect(inspector.scan()).rejects.toBe(denied)

    const rootDenied = new CapCutInspector(
      'C:\\Local',
      fileSystem({
        readDirectory: async () => {
          throw denied
        }
      })
    )
    await expect(rootDenied.scan()).rejects.toBe(denied)
  })

  test('tolera un archivo borrado durante el scan y propaga otros errores de stat', async () => {
    const missing = Object.assign(new Error('Borrado'), { code: 'ENOENT' })
    const denied = Object.assign(new Error('Acceso denegado'), { code: 'EACCES' })
    let presetRoot = ''
    const readDirectory = async (path: string): Promise<InspectorDirectoryEntry[]> =>
      path === presetRoot ? [entry('intermitente.mp4', 'file')] : []
    const tolerant = new CapCutInspector(
      'C:\\Local',
      fileSystem({
        readDirectory,
        fileDetails: async () => {
          throw missing
        }
      })
    )
    presetRoot = tolerant.locations[1]?.path ?? ''
    await expect(tolerant.scan()).resolves.toMatchObject({ file: null })

    const strict = new CapCutInspector(
      'C:\\Local',
      fileSystem({
        readDirectory,
        fileDetails: async () => {
          throw denied
        }
      })
    )
    presetRoot = strict.locations[1]?.path ?? ''
    await expect(strict.scan()).rejects.toBe(denied)
  })

  test('propaga un error inesperado al resolver una raiz para revelar', async () => {
    const denied = Object.assign(new Error('Acceso denegado'), { code: 'EACCES' })
    const candidate = 'C:\\Local\\video.mp4'
    const fake = fileSystem({
      realPath: async (path) => {
        if (path === candidate) return path
        throw denied
      }
    })
    const inspector = new CapCutInspector('C:\\Local', fake)

    await expect(inspector.resolveRevealableFile(candidate)).rejects.toBe(denied)
  })

  test('elige el MP4 mas reciente y omite alpha, extensiones ajenas, symlinks y rutas de proyecto incorrectas', async () => {
    const { inspector, root } = await makeInspector()
    const [projects, presets, motion] = inspector.locations
    if (!projects || !presets || !motion) throw new Error('Faltan ubicaciones')

    const projectVideo = join(projects.path, 'draft-a', 'Resources', 'combination', 'proyecto.MP4')
    const projectDecoy = join(projects.path, 'draft-a', 'Resources', 'otro', 'fuera.mp4')
    const alphaVideo = join(projects.path, 'draft-a', 'Resources', 'combination', 'auxiliar.alpha.mp4')
    const newest = join(presets.path, 'nested', 'video-final.mp4')
    const motionVideo = join(motion.path, 'motion.mp4')
    const symlinkTarget = join(root, 'symlink-target')

    await makeFile(projectVideo, 'project', new Date('2026-08-29T10:00:00.000Z'))
    await makeFile(projectDecoy, 'decoy', new Date('2026-08-29T16:00:00.000Z'))
    await makeFile(alphaVideo, 'alpha', new Date('2026-08-29T17:00:00.000Z'))
    await makeFile(newest, 'newest-video', new Date('2026-08-29T15:00:00.000Z'))
    await makeFile(motionVideo, 'motion', new Date('2026-08-29T12:00:00.000Z'))
    await makeFile(join(presets.path, 'nota.txt'), 'text')
    await mkdir(join(projects.path, 'draft-sin-combination'), { recursive: true })
    await makeFile(join(symlinkTarget, 'oculto.mp4'), 'linked', new Date('2026-08-29T18:00:00.000Z'))
    await symlink(symlinkTarget, join(presets.path, 'enlace'), 'junction')

    const result = await inspector.scan()

    expect(result.file).toMatchObject({
      fileName: 'video-final.mp4',
      source: 'preset-combination',
      sourceLabel: 'Combinaciones preestablecidas',
      size: 12
    })
    expect(result.locations.every((location) => location.available)).toBe(true)
    await expect(inspector.resolveRevealableFile(newest)).resolves.toBe(await realpath(newest))
    await expect(inspector.resolveRevealableFile(projectVideo)).resolves.toBe(await realpath(projectVideo))
    await expect(inspector.resolveRevealableFile(projectDecoy)).rejects.toThrow('ubicacion interna conocida')
  })

  test('rechaza rutas externas, alpha, extensiones, directorios y archivos borrados', async () => {
    const { inspector, root } = await makeInspector()
    const projects = inspector.locations[0]
    if (!projects) throw new Error('Falta la ubicacion de proyectos')
    const alpha = join(projects.path, 'draft', 'Resources', 'combination', 'aux.alpha.mp4')
    const external = join(root, 'externo.mp4')
    const directoryMp4 = join(projects.path, 'draft', 'Resources', 'combination', 'carpeta.mp4')
    const missing = join(projects.path, 'draft', 'Resources', 'combination', 'borrado.mp4')
    await makeFile(alpha)
    await makeFile(external)
    await mkdir(directoryMp4, { recursive: true })

    await expect(inspector.resolveRevealableFile(alpha)).rejects.toThrow('MP4 compatible')
    await expect(inspector.resolveRevealableFile(join(root, 'nota.txt'))).rejects.toThrow('MP4 compatible')
    await expect(inspector.resolveRevealableFile(external)).rejects.toThrow('ubicacion interna conocida')
    await expect(inspector.resolveRevealableFile(directoryMp4)).rejects.toThrow('no corresponde a un archivo')
    await expect(inspector.resolveRevealableFile(missing)).rejects.toThrow('ya no existe')
  })
})
