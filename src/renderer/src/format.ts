export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const remainder = totalSeconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function formatBitRate(bitsPerSecond: number): string {
  if (bitsPerSecond < 1_000_000) return `${Math.round(bitsPerSecond / 1_000)} kb/s`
  return `${(bitsPerSecond / 1_000_000).toFixed(2).replace(/\.00$/u, '')} Mb/s`
}

export function formatFrameRate(framesPerSecond: number): string {
  return `${framesPerSecond.toFixed(2).replace(/\.00$/u, '')} FPS`
}

export function formatSampleRate(samplesPerSecond: number): string {
  return `${(samplesPerSecond / 1_000).toFixed(1).replace(/\.0$/u, '')} kHz`
}
