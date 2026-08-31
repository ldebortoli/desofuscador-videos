import type { AudioStreamInfo, MediaAnalysis, VideoStreamInfo } from '../shared/types'

interface ProbeStream {
  codec_type?: string
  codec_name?: string
  codec_long_name?: string
  profile?: string
  width?: number
  height?: number
  avg_frame_rate?: string
  r_frame_rate?: string
  pix_fmt?: string
  bit_rate?: string
  sample_rate?: string
  channels?: number
  channel_layout?: string
}

interface ProbeDocument {
  streams?: ProbeStream[]
  format?: {
    format_name?: string
    format_long_name?: string
    duration?: string
    bit_rate?: string
  }
}

interface CapCutVideoStream {
  codec_id?: number
  duration?: number
  nBitrate?: number
  nImageWidth?: number
  nImageHeight?: number
  pixelFormat?: number
  sFrameRate?: { num?: number; den?: number }
}

interface CapCutAudioStream {
  codec_id?: number
  duration?: number
  nBitrate?: number
  nChannelCount?: number
  nSampleRate?: number
}

interface CapCutMediaDocument {
  steAVInfo?: {
    duration?: number
    formatName?: string
    i64DataRate?: number
    isCryptorFile?: number
    sVideoStreamInfo?: CapCutVideoStream
    sAudioStreamInfo?: CapCutAudioStream[]
  }
}

export type MediaProbe = (filePath: string) => Promise<string>

const videoCodecs = new Map<number, [string, string]>([
  [27, ['h264', 'H.264 / AVC']],
  [173, ['hevc', 'H.265 / HEVC']],
  [226, ['av1', 'AV1']]
])

const audioCodecs = new Map<number, [string, string]>([
  [86018, ['aac', 'AAC (Advanced Audio Coding)']],
  [86076, ['opus', 'Opus']],
  [86017, ['mp3', 'MP3 (MPEG audio layer 3)']]
])

function numberOrNull(value: string | number | undefined): number | null {
  if (value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function frameRate(value: string | undefined): number | null {
  if (!value) return null
  const [numerator = '', denominator = ''] = value.split('/')
  const parsed = Number(numerator) / Number(denominator)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function ratio(value: { num?: number; den?: number } | undefined): number | null {
  const parsed = Number(value?.num) / Number(value?.den)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function codec(codecId: number | undefined, known: Map<number, [string, string]>): [string, string | null] {
  if (codecId === undefined) return ['unknown', null]
  const match = known.get(codecId)
  return match ?? [`codec-${codecId}`, null]
}

function videoInfo(stream: ProbeStream): VideoStreamInfo {
  return {
    codecName: stream.codec_name ?? 'unknown',
    codecLongName: stream.codec_long_name ?? null,
    profile: stream.profile ?? null,
    width: numberOrNull(stream.width),
    height: numberOrNull(stream.height),
    frameRate: frameRate(stream.avg_frame_rate ?? stream.r_frame_rate),
    pixelFormat: stream.pix_fmt ?? null,
    bitRate: numberOrNull(stream.bit_rate)
  }
}

function audioInfo(stream: ProbeStream): AudioStreamInfo {
  return {
    codecName: stream.codec_name ?? 'unknown',
    codecLongName: stream.codec_long_name ?? null,
    profile: stream.profile ?? null,
    sampleRate: numberOrNull(stream.sample_rate),
    channels: numberOrNull(stream.channels),
    channelLayout: stream.channel_layout ?? null,
    bitRate: numberOrNull(stream.bit_rate)
  }
}

export function parseProbeOutput(output: string): MediaAnalysis {
  const document = JSON.parse(output) as ProbeDocument
  const streams = document.streams ?? []
  const format = document.format ?? {}
  const video = streams.find((stream) => stream.codec_type === 'video')
  const audio = streams.find((stream) => stream.codec_type === 'audio')

  return {
    status: 'ready',
    detail: video ? 'Analisis multimedia completado.' : 'El contenedor no informa una pista de video.',
    container: format.format_long_name ?? format.format_name ?? null,
    durationSeconds: numberOrNull(format.duration),
    bitRate: numberOrNull(format.bit_rate),
    video: video ? videoInfo(video) : null,
    audio: audio ? audioInfo(audio) : null
  }
}

function parseJsonLine(line: string): CapCutMediaDocument | null {
  try {
    return JSON.parse(line) as CapCutMediaDocument
  } catch {
    return null
  }
}

export function parseCapCutMediaInfo(output: string): MediaAnalysis | null {
  const documents = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseJsonLine)
  const avInfo = documents.find((document) => document?.steAVInfo)?.steAVInfo
  if (!avInfo) return null

  const video = avInfo.sVideoStreamInfo
  const audio = avInfo.sAudioStreamInfo?.[0]
  const [videoCodecName, videoCodecLongName] = codec(video?.codec_id, videoCodecs)
  const [audioCodecName, audioCodecLongName] = codec(audio?.codec_id, audioCodecs)
  const protectedResource = (avInfo.isCryptorFile ?? 0) > 0

  return {
    status: protectedResource ? 'protected' : 'ready',
    detail: protectedResource
      ? 'Metadatos leidos del indice local de CapCut. Es un recurso interno protegido y no un MP4 autonomo.'
      : 'Metadatos leidos del indice local de CapCut.',
    container: avInfo.formatName || 'MP4 (indice de CapCut)',
    durationSeconds: numberOrNull(avInfo.duration) === null ? null : Number(avInfo.duration) / 1_000_000,
    bitRate: numberOrNull(avInfo.i64DataRate),
    video: video
      ? {
          codecName: videoCodecName,
          codecLongName: videoCodecLongName,
          profile: null,
          width: numberOrNull(video.nImageWidth),
          height: numberOrNull(video.nImageHeight),
          frameRate: ratio(video.sFrameRate),
          pixelFormat: video.pixelFormat === 0 ? 'yuv420p' : null,
          bitRate: numberOrNull(video.nBitrate)
        }
      : null,
    audio: audio
      ? {
          codecName: audioCodecName,
          codecLongName: audioCodecLongName,
          profile: null,
          sampleRate: numberOrNull(audio.nSampleRate),
          channels: numberOrNull(audio.nChannelCount),
          channelLayout: audio.nChannelCount === 1 ? 'mono' : audio.nChannelCount === 2 ? 'stereo' : null,
          bitRate: numberOrNull(audio.nBitrate)
        }
      : null
  }
}

function failedAnalysis(status: 'incomplete' | 'unavailable', detail: string): MediaAnalysis {
  return {
    status,
    detail,
    container: null,
    durationSeconds: null,
    bitRate: null,
    video: null,
    audio: null
  }
}

export async function analyzeMedia(filePath: string, probe: MediaProbe): Promise<MediaAnalysis> {
  try {
    return parseProbeOutput(await probe(filePath))
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : String(reason)
    if (/moov atom not found/iu.test(message)) {
      return failedAnalysis(
        'incomplete',
        'MP4 interno incompleto: falta el bloque moov. CapCut puede no haber terminado de escribirlo.'
      )
    }
    if (/invalid data found|end of file|partial file/iu.test(message)) {
      return failedAnalysis('incomplete', 'El archivo interno aun no tiene una estructura MP4 analizable.')
    }
    return failedAnalysis('unavailable', 'No se pudo completar el analisis tecnico del archivo.')
  }
}
