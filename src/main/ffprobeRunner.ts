import { execFile } from 'node:child_process'
import ffprobe from '@ffprobe-installer/ffprobe'

export function resolveFfprobePath(path = ffprobe.path): string {
  return path.replace('app.asar', 'app.asar.unpacked')
}

export function runFfprobe(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      resolveFfprobePath(),
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', '--', filePath],
      { windowsHide: true, timeout: 8_000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout)
          return
        }
        reject(new Error(stderr.trim() || error.message))
      }
    )
  })
}
