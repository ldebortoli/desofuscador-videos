export type Mp4Source = 'project-combination' | 'preset-combination' | 'motion-blur'

export interface Mp4FileInfo {
  fileName: string
  filePath: string
  source: Mp4Source
  sourceLabel: string
  modifiedAt: string
  size: number
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

export interface InspectorApi {
  scan: () => Promise<ScanResult>
  reveal: (path: string) => Promise<void>
  copyPath: (path: string) => Promise<void>
}
