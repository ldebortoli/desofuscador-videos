import { readdir, realpath, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Mp4FileInfo, Mp4Source, ScanResult, SearchLocation } from '../shared/types'

export interface InspectorDirectoryEntry {
  name: string
  isDirectory: () => boolean
  isFile: () => boolean
  isSymbolicLink: () => boolean
}

export interface InspectorFileDetails {
  mtime: Date
  size: number
  isFile: () => boolean
}

export interface InspectorFileSystem {
  readDirectory: (path: string) => Promise<InspectorDirectoryEntry[]>
  realPath: (path: string) => Promise<string>
  fileDetails: (path: string) => Promise<InspectorFileDetails>
}

const nodeFileSystem: InspectorFileSystem = {
  readDirectory: (path) => readdir(path, { withFileTypes: true }),
  realPath: (path) => realpath(path),
  fileDetails: (path) => stat(path)
}

interface LocationDefinition {
  source: Mp4Source
  label: string
  path: string
}

interface ScannedLocation {
  location: SearchLocation
  files: Mp4FileInfo[]
}

function errorCode(reason: unknown): string {
  return reason && typeof reason === 'object' && 'code' in reason ? String(reason.code) : ''
}

function isMissingPath(reason: unknown): boolean {
  return ['ENOENT', 'ENOTDIR'].includes(errorCode(reason))
}

function isAlphaVideo(path: string): boolean {
  return basename(path).toLowerCase().endsWith('.alpha.mp4')
}

function includesProjectCombination(relativePath: string): boolean {
  const segments = relativePath.split(sep).map((segment) => segment.toLowerCase())
  return segments.some((segment, index) => segment === 'resources' && segments[index + 1] === 'combination')
}

function acceptsSource(relativePath: string, source: Mp4Source): boolean {
  return source !== 'project-combination' || includesProjectCombination(relativePath)
}

function isInside(candidate: string, root: string): boolean {
  const child = relative(root, candidate)
  return child !== '' && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child)
}

export class CapCutInspector {
  readonly locations: LocationDefinition[]

  constructor(
    localAppData = process.env['LOCALAPPDATA'] ?? '',
    private readonly fileSystem: InspectorFileSystem = nodeFileSystem
  ) {
    if (!localAppData.trim()) throw new Error('Windows no informo la carpeta LOCALAPPDATA')
    const userData = join(resolve(localAppData), 'CapCut', 'User Data')
    this.locations = [
      {
        source: 'project-combination',
        label: 'Recursos del proyecto',
        path: join(userData, 'Projects', 'com.lveditor.draft')
      },
      {
        source: 'preset-combination',
        label: 'Combinaciones preestablecidas',
        path: join(userData, 'Presets', 'Combination', 'Resources')
      },
      {
        source: 'motion-blur',
        label: 'Cache de desenfoque de movimiento',
        path: join(userData, 'Cache', 'MotionBlurCache')
      }
    ]
  }

  async scan(): Promise<ScanResult> {
    const scanned = await Promise.all(this.locations.map((location) => this.scanLocation(location)))
    const files = scanned
      .flatMap((entry) => entry.files)
      .sort((left, right) => new Date(right.modifiedAt).getTime() - new Date(left.modifiedAt).getTime())
    return {
      file: files[0] ?? null,
      locations: scanned.map((entry) => entry.location)
    }
  }

  async resolveRevealableFile(filePath: string): Promise<string> {
    if (extname(filePath).toLowerCase() !== '.mp4' || isAlphaVideo(filePath)) {
      throw new Error('El archivo no es un MP4 compatible del inspector')
    }

    let actualFile: string
    try {
      actualFile = await this.fileSystem.realPath(filePath)
      if (!(await this.fileSystem.fileDetails(actualFile)).isFile())
        throw new Error('La ruta no corresponde a un archivo')
    } catch (reason) {
      if (isMissingPath(reason)) throw new Error('El MP4 ya no existe; busca de nuevo')
      throw reason
    }

    for (const location of this.locations) {
      try {
        const actualRoot = await this.fileSystem.realPath(location.path)
        if (!isInside(actualFile, actualRoot)) continue
        const relativePath = relative(actualRoot, actualFile)
        if (!acceptsSource(relativePath, location.source)) continue
        return actualFile
      } catch (reason) {
        if (!isMissingPath(reason)) throw reason
      }
    }

    throw new Error('El archivo no pertenece a una ubicacion interna conocida de CapCut')
  }

  private async scanLocation(definition: LocationDefinition): Promise<ScannedLocation> {
    const files: Mp4FileInfo[] = []
    try {
      if (definition.source === 'project-combination') {
        const projects = await this.fileSystem.readDirectory(definition.path)
        await Promise.all(
          projects.map(async (project) => {
            if (!project.isDirectory() || project.isSymbolicLink()) return
            try {
              await this.walk(join(definition.path, project.name, 'Resources', 'combination'), definition, files)
            } catch (reason) {
              if (!isMissingPath(reason)) throw reason
            }
          })
        )
      } else {
        await this.walk(definition.path, definition, files)
      }
      return { location: { ...definition, available: true }, files }
    } catch (reason) {
      if (!isMissingPath(reason)) throw reason
      return { location: { ...definition, available: false }, files }
    }
  }

  private async walk(currentPath: string, definition: LocationDefinition, files: Mp4FileInfo[]): Promise<void> {
    const entries = await this.fileSystem.readDirectory(currentPath)
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isSymbolicLink()) return
        const entryPath = join(currentPath, entry.name)
        if (entry.isDirectory()) {
          await this.walk(entryPath, definition, files)
          return
        }
        if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.mp4' || isAlphaVideo(entry.name)) return
        try {
          const details = await this.fileSystem.fileDetails(entryPath)
          files.push({
            fileName: entry.name,
            filePath: entryPath,
            source: definition.source,
            sourceLabel: definition.label,
            modifiedAt: details.mtime.toISOString(),
            size: details.size
          })
        } catch (reason) {
          if (!isMissingPath(reason)) throw reason
        }
      })
    )
  }
}
