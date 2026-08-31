export type Mp4Source = 'project-combination' | 'preset-combination' | 'motion-blur'

export type MediaAnalysisStatus = 'ready' | 'protected' | 'incomplete' | 'unavailable'

export interface VideoStreamInfo {
  codecName: string
  codecLongName: string | null
  profile: string | null
  width: number | null
  height: number | null
  frameRate: number | null
  pixelFormat: string | null
  bitRate: number | null
}

export interface AudioStreamInfo {
  codecName: string
  codecLongName: string | null
  profile: string | null
  sampleRate: number | null
  channels: number | null
  channelLayout: string | null
  bitRate: number | null
}

export interface MediaAnalysis {
  status: MediaAnalysisStatus
  detail: string
  container: string | null
  durationSeconds: number | null
  bitRate: number | null
  video: VideoStreamInfo | null
  audio: AudioStreamInfo | null
}

export interface Mp4FileInfo {
  fileName: string
  filePath: string
  source: Mp4Source
  sourceLabel: string
  modifiedAt: string
  size: number
  media: MediaAnalysis
}

export interface SearchLocation {
  source: Mp4Source
  label: string
  path: string
  available: boolean
}

export interface ScanResult {
  file: Mp4FileInfo | null
  locations: SearchLocation[]
}

export type FileActionStatus = 'completed' | 'cancelled'

export interface DeobfuscationResult {
  status: FileActionStatus
  outputPath?: string
}

export interface FolderCleanupResult {
  status: FileActionStatus
  removedCount?: number
}

export interface InspectorApi {
  scan: () => Promise<ScanResult>
  reveal: (path: string) => Promise<void>
  copyPath: (path: string) => Promise<void>
  getOutputFolder: () => Promise<string>
  openOutputFolder: () => Promise<void>
  deobfuscate: (path: string, outputName?: string) => Promise<DeobfuscationResult>
  emptyFolder: (path: string) => Promise<FolderCleanupResult>
}
