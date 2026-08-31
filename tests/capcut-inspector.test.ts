import { dirname, join } from 'node:path'
import { mkdir, mkdtemp, realpath, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { CapCutInspector, type InspectorDirectoryEntry, type InspectorFileSystem } from '../src/main/capcutInspector'
import type { MediaAnalysis } from '../src/shared/types'

const temporaryDirectories: string[] = []
const unavailableMedia: MediaAnalysis = {
  status: 'unavailable',
  detail: 'Control de prueba.',
  container: null,
  durationSeconds: null,
  bitRate: null,
  video: null,
  audio: null
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function makeInspector(): Promise<{ inspector: CapCutInspector; root: string }> {
  const root = await mkdtemp(join(tmpdir(), 'clip-cache-inspector-'))
  temporaryDirectories.push(root)
  return { inspector: new CapCutInspector(root, undefined, async () => unavailableMedia), root }
}

async function makeFile(
  path: string,
  content: string | Uint8Array = 'video-control',
  modifiedAt = new Date()
): Promise<void> {
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
      size: 12,
      media: unavailableMedia
    })
    expect(result.locations.every((location) => location.available)).toBe(true)
    await expect(inspector.resolveRevealableFile(newest)).resolves.toBe(await realpath(newest))
    await expect(inspector.resolveRevealableFile(projectVideo)).resolves.toBe(await realpath(projectVideo))
    await expect(inspector.resolveRevealableFile(projectDecoy)).rejects.toThrow('ubicacion interna conocida')
  })

  test('analiza el archivo elegido con el ffprobe incluido', async () => {
    const root = await mkdtemp(join(tmpdir(), 'clip-cache-inspector-probe-'))
    temporaryDirectories.push(root)
    const inspector = new CapCutInspector(root)
    const presetRoot = inspector.locations[1]
    if (!presetRoot) throw new Error('Falta la ubicacion de presets')
    await makeFile(join(presetRoot.path, 'cache-incompleto.mp4'), 'contenido no finalizado')

    const result = await inspector.scan()

    expect(result.file?.media).toMatchObject({ status: 'incomplete' })
  })

  test('usa el indice de CapCut cuando ffprobe no puede abrir un recurso protegido', async () => {
    const root = await mkdtemp(join(tmpdir(), 'clip-cache-inspector-index-'))
    temporaryDirectories.push(root)
    const inspector = new CapCutInspector(root)
    const presetRoot = inspector.locations[1]
    if (!presetRoot) throw new Error('Falta la ubicacion de presets')
    const hash = '51fd486ce06f4055b949f4b19f65f3f4'
    await makeFile(join(presetRoot.path, `${hash}.mp4`), 'contenido interno protegido')
    await makeFile(
      join(root, 'CapCut', 'User Data', 'Cache', 'importcache3', 'mediainfo', `${hash}.json`),
      JSON.stringify({
        steAVInfo: {
          duration: 11_700_000,
          isCryptorFile: 2,
          sVideoStreamInfo: { codec_id: 27, nImageWidth: 1080, nImageHeight: 1920, sFrameRate: { num: 30, den: 1 } },
          sAudioStreamInfo: [{ codec_id: 86018, nChannelCount: 2, nSampleRate: 44_100 }]
        }
      })
    )

    const result = await inspector.scan()

    expect(result.file?.media).toMatchObject({
      status: 'protected',
      durationSeconds: 11.7,
      video: { codecName: 'h264', width: 1080, height: 1920, frameRate: 30 },
      audio: { codecName: 'aac', sampleRate: 44_100, channelLayout: 'stereo' }
    })
  })

  test('conserva el resultado de ffprobe para un MP4 valido sin consultar el indice', async () => {
    const root = await mkdtemp(join(tmpdir(), 'clip-cache-inspector-valid-'))
    temporaryDirectories.push(root)
    const inspector = new CapCutInspector(root)
    const presetRoot = inspector.locations[1]
    if (!presetRoot) throw new Error('Falta la ubicacion de presets')
    const minimalMp4 = Uint8Array.from([
      0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 2, 0, 105, 115, 111, 109, 105, 115, 111, 50, 0, 0, 0,
      8, 109, 111, 111, 118
    ])
    await makeFile(join(presetRoot.path, 'contenedor-vacio.mp4'), minimalMp4)

    const result = await inspector.scan()

    expect(result.file?.media).toMatchObject({ status: 'ready' })
  })

  test('ignora un indice presente que no contiene metadata multimedia', async () => {
    const root = await mkdtemp(join(tmpdir(), 'clip-cache-inspector-empty-index-'))
    temporaryDirectories.push(root)
    const inspector = new CapCutInspector(root)
    const presetRoot = inspector.locations[1]
    if (!presetRoot) throw new Error('Falta la ubicacion de presets')
    await makeFile(join(presetRoot.path, 'sin-metadata.mp4'), 'contenido no finalizado')
    await makeFile(join(root, 'CapCut', 'User Data', 'Cache', 'importcache3', 'mediainfo', 'sin-metadata.json'), '{}')

    const result = await inspector.scan()

    expect(result.file?.media).toMatchObject({ status: 'incomplete' })
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
