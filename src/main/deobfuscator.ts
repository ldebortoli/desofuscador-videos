import type { ChildProcess } from 'node:child_process'
import { basename, extname, join, resolve } from 'node:path'

export interface ToolExecutionOptions {
  windowsHide: boolean
  timeout: number
  maxBuffer: number
}

export type ToolCallback = (error: Error | null, stdout: string, stderr: string) => void
export type ToolExecutor = (
  executable: string,
  arguments_: string[],
  options: ToolExecutionOptions,
  callback: ToolCallback
) => ChildProcess
export type ProcessTreeTerminator = (child: ChildProcess) => void

export interface DeobfuscatorOptions {
  powerShellPath: string
  scriptPath: string
  ffprobePath: string
  execute: ToolExecutor
  terminate: ProcessTreeTerminator
}

export function suggestedOutputName(inputPath: string): string {
  const extension = extname(inputPath)
  return `${basename(inputPath, extension)}_desofuscado.mp4`
}

export function resolveOutputFolder(homePath: string, configuredPath?: string): string {
  const configured = configuredPath?.trim()
  return configured ? resolve(configured) : join(homePath, 'Videos', 'Cortos')
}

export function normalizeOutputName(inputPath: string, requestedName: unknown): string {
  if (requestedName !== undefined && typeof requestedName !== 'string')
    throw new Error('El nombre de salida no es valido')

  const trimmed = requestedName?.trim() ?? ''
  if (!trimmed) return suggestedOutputName(inputPath)
  if (trimmed.length > 180) throw new Error('El nombre de salida no puede superar 180 caracteres')
  if (trimmed.toLowerCase() === '.mp4') throw new Error('Ese nombre esta reservado por Windows')
  const hasControlCharacter = [...trimmed].some((character) => character.charCodeAt(0) < 32)
  if (hasControlCharacter || /[<>:"/\\|?*]/u.test(trimmed) || /[. ]$/u.test(trimmed))
    throw new Error('El nombre contiene caracteres no permitidos por Windows')

  const extension = extname(trimmed)
  if (extension && extension.toLowerCase() !== '.mp4')
    throw new Error('Usa un nombre sin extension o con extension .mp4')
  const fileName = extension ? trimmed : `${trimmed}.mp4`
  const stem = fileName.slice(0, -4)
  if (!stem || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/iu.test(stem))
    throw new Error('Ese nombre esta reservado por Windows')
  return fileName
}

export type PathExists = (path: string) => Promise<boolean>

export async function nextAvailableOutputPath(
  folderPath: string,
  fileName: string,
  pathExists: PathExists
): Promise<string> {
  const extension = extname(fileName)
  const stem = basename(fileName, extension)
  for (let copy = 1; copy <= 10_000; copy += 1) {
    const candidateName = copy === 1 ? fileName : `${stem} (${copy})${extension}`
    const candidatePath = join(folderPath, candidateName)
    if (!(await pathExists(candidatePath))) return candidatePath
  }
  throw new Error('No se encontro un nombre de salida disponible en la carpeta Cortos')
}

function usefulErrorLine(output: string): string | null {
  const ignored = /^(En |At |\+ |CategoryInfo|FullyQualifiedErrorId|\s*~)/u
  return (
    output
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !ignored.test(line)) ?? null
  )
}

export function deobfuscationError(error: Error, stdout: string, stderr: string): Error {
  const detail = usefulErrorLine(stderr) ?? usefulErrorLine(stdout)
  return new Error(detail ?? `No se pudo desofuscar el video: ${error.message}`)
}

export class BdveDeobfuscator {
  private activeProcess: ChildProcess | null = null

  constructor(private readonly options: DeobfuscatorOptions) {}

  get isRunning(): boolean {
    return this.activeProcess !== null
  }

  async run(inputPath: string, outputPath: string): Promise<void> {
    if (this.activeProcess) throw new Error('Ya hay una desofuscacion en curso')

    await new Promise<void>((resolve, reject) => {
      let child: ChildProcess
      try {
        child = this.options.execute(
          this.options.powerShellPath,
          [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            this.options.scriptPath,
            '-InputPath',
            inputPath,
            '-OutputPath',
            outputPath,
            '-FfprobePath',
            this.options.ffprobePath
          ],
          { windowsHide: true, timeout: 10 * 60_000, maxBuffer: 4 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (this.activeProcess === child) this.activeProcess = null
            if (error) {
              reject(deobfuscationError(error, stdout, stderr))
              return
            }
            resolve()
          }
        )
      } catch (reason) {
        reject(reason)
        return
      }
      this.activeProcess = child
    })
  }

  cancel(): void {
    if (!this.activeProcess) return
    const child = this.activeProcess
    this.activeProcess = null
    this.options.terminate(child)
  }
}
