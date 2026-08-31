import type { ChildProcess } from 'node:child_process'
import { basename, extname } from 'node:path'

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
            this.options.ffprobePath,
            '-Force'
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
