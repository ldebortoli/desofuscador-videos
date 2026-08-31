import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'

interface StoredOutputSettings {
  outputFolder?: unknown
}

function isMissingFile(reason: unknown): boolean {
  return Boolean(reason && typeof reason === 'object' && 'code' in reason && reason.code === 'ENOENT')
}

function storedFolder(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const folder = (value as StoredOutputSettings).outputFolder
  return typeof folder === 'string' && isAbsolute(folder) ? resolve(folder) : null
}

export class OutputFolderSettings {
  private readonly fallbackFolder: string

  constructor(
    private readonly settingsFile: string,
    fallbackFolder: string
  ) {
    if (!isAbsolute(settingsFile) || !isAbsolute(fallbackFolder)) {
      throw new Error('Las rutas de configuracion y salida deben ser absolutas')
    }
    this.fallbackFolder = resolve(fallbackFolder)
  }

  async get(): Promise<string> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.settingsFile, 'utf8'))
      return storedFolder(parsed) ?? this.fallbackFolder
    } catch (reason) {
      if (reason instanceof SyntaxError || isMissingFile(reason)) return this.fallbackFolder
      throw reason
    }
  }

  async set(folderPath: string): Promise<string> {
    if (!isAbsolute(folderPath)) throw new Error('La carpeta de salida debe ser una ruta absoluta')
    const normalized = resolve(folderPath)
    await mkdir(normalized, { recursive: true })
    await mkdir(dirname(this.settingsFile), { recursive: true })
    await writeFile(this.settingsFile, `${JSON.stringify({ outputFolder: normalized }, null, 2)}\n`, 'utf8')
    return normalized
  }
}
