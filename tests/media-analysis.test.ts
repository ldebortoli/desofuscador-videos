import { describe, expect, test, vi } from 'vitest'
import { analyzeMedia, parseCapCutMediaInfo, parseProbeOutput } from '../src/main/mediaAnalysis'

const validProbe = JSON.stringify({
  streams: [
    {
      codec_type: 'video',
      codec_name: 'h264',
      codec_long_name: 'H.264 / AVC / MPEG-4 AVC',
      profile: 'High',
      width: 1920,
      height: 1080,
      avg_frame_rate: '30000/1001',
      r_frame_rate: '30/1',
      pix_fmt: 'yuv420p',
      bit_rate: '8000000'
    },
    {
      codec_type: 'audio',
      codec_name: 'aac',
      codec_long_name: 'AAC (Advanced Audio Coding)',
      profile: 'LC',
      sample_rate: '48000',
      channels: 2,
      channel_layout: 'stereo',
      bit_rate: '256000'
    }
  ],
  format: {
    format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
    format_long_name: 'QuickTime / MOV',
    duration: '62.400000',
    bit_rate: '8256000'
  }
})

describe('analisis multimedia', () => {
  test('normaliza video, audio y contenedor devueltos por ffprobe', async () => {
    const probe = vi.fn(async () => validProbe)
    const filePath = String.raw`C:\CapCut\video.mp4`
    const result = await analyzeMedia(filePath, probe)

    expect(probe).toHaveBeenCalledWith(filePath)
    expect(result).toMatchObject({
      status: 'ready',
      container: 'QuickTime / MOV',
      durationSeconds: 62.4,
      bitRate: 8_256_000,
      video: {
        codecName: 'h264',
        profile: 'High',
        width: 1920,
        height: 1080,
        pixelFormat: 'yuv420p',
        bitRate: 8_000_000
      },
      audio: {
        codecName: 'aac',
        sampleRate: 48_000,
        channels: 2,
        channelLayout: 'stereo',
        bitRate: 256_000
      }
    })
    expect(result.video?.frameRate).toBeCloseTo(29.97, 2)
  })

  test('tolera metadata minima y usa los fallbacks disponibles', () => {
    expect(
      parseProbeOutput(
        JSON.stringify({
          streams: [
            { codec_type: 'video', r_frame_rate: '0/0', width: 'invalido', bit_rate: 'invalido' },
            { codec_type: 'audio' }
          ],
          format: { format_name: 'mp4' }
        })
      )
    ).toEqual({
      status: 'ready',
      detail: 'Analisis multimedia completado.',
      container: 'mp4',
      durationSeconds: null,
      bitRate: null,
      video: {
        codecName: 'unknown',
        codecLongName: null,
        profile: null,
        width: null,
        height: null,
        frameRate: null,
        pixelFormat: null,
        bitRate: null
      },
      audio: {
        codecName: 'unknown',
        codecLongName: null,
        profile: null,
        sampleRate: null,
        channels: null,
        channelLayout: null,
        bitRate: null
      }
    })

    expect(parseProbeOutput('{}')).toEqual({
      status: 'ready',
      detail: 'El contenedor no informa una pista de video.',
      container: null,
      durationSeconds: null,
      bitRate: null,
      video: null,
      audio: null
    })
    expect(parseProbeOutput(JSON.stringify({ streams: [{ codec_type: 'video' }] })).video?.frameRate).toBeNull()
  })

  test('distingue cache incompleto, datos invalidos y fallos del analizador', async () => {
    await expect(
      analyzeMedia('cache.mp4', async () => {
        throw new Error('moov atom not found')
      })
    ).resolves.toMatchObject({ status: 'incomplete', detail: expect.stringContaining('bloque moov') })

    await expect(
      analyzeMedia('cache.mp4', async () => {
        throw 'Invalid data found when processing input'
      })
    ).resolves.toMatchObject({ status: 'incomplete', detail: expect.stringContaining('estructura MP4') })

    await expect(analyzeMedia('cache.mp4', async () => '{')).resolves.toEqual({
      status: 'unavailable',
      detail: 'No se pudo completar el analisis tecnico del archivo.',
      container: null,
      durationSeconds: null,
      bitRate: null,
      video: null,
      audio: null
    })
  })

  test('lee del indice de CapCut los codecs de un recurso interno protegido', () => {
    const result = parseCapCutMediaInfo(
      [
        '{"v":3}',
        JSON.stringify({
          steAVInfo: {
            duration: 11_700_000,
            formatName: '',
            i64DataRate: 8_947_304,
            isCryptorFile: 2,
            sVideoStreamInfo: {
              codec_id: 27,
              nBitrate: 8_747_403,
              nImageWidth: 1080,
              nImageHeight: 1920,
              pixelFormat: 0,
              sFrameRate: { num: 30, den: 1 }
            },
            sAudioStreamInfo: [{ codec_id: 86018, nBitrate: 194_298, nChannelCount: 2, nSampleRate: 44_100 }]
          }
        })
      ].join('\n')
    )

    expect(result).toMatchObject({
      status: 'protected',
      detail: expect.stringContaining('recurso interno protegido'),
      container: 'MP4 (indice de CapCut)',
      durationSeconds: 11.7,
      bitRate: 8_947_304,
      video: {
        codecName: 'h264',
        codecLongName: 'H.264 / AVC',
        width: 1080,
        height: 1920,
        frameRate: 30,
        pixelFormat: 'yuv420p',
        bitRate: 8_747_403
      },
      audio: {
        codecName: 'aac',
        codecLongName: 'AAC (Advanced Audio Coding)',
        sampleRate: 44_100,
        channels: 2,
        channelLayout: 'stereo',
        bitRate: 194_298
      }
    })
  })

  test('tolera indices parciales, codecs desconocidos y archivos sin pistas', () => {
    expect(parseCapCutMediaInfo('invalido\n{}\n')).toBeNull()

    expect(
      parseCapCutMediaInfo(
        JSON.stringify({
          steAVInfo: {
            formatName: 'mp4',
            isCryptorFile: 0,
            sVideoStreamInfo: { codec_id: 999, pixelFormat: 1, sFrameRate: { num: 0, den: 0 } },
            sAudioStreamInfo: [{ codec_id: 998, nChannelCount: 1 }]
          }
        })
      )
    ).toMatchObject({
      status: 'ready',
      detail: 'Metadatos leidos del indice local de CapCut.',
      container: 'mp4',
      durationSeconds: null,
      video: { codecName: 'codec-999', frameRate: null, pixelFormat: null },
      audio: { codecName: 'codec-998', channelLayout: 'mono' }
    })

    expect(parseCapCutMediaInfo(JSON.stringify({ steAVInfo: {} }))).toMatchObject({
      status: 'ready',
      video: null,
      audio: null
    })
    expect(
      parseCapCutMediaInfo(JSON.stringify({ steAVInfo: { sAudioStreamInfo: [{ codec_id: 86076, nChannelCount: 3 }] } }))
        ?.audio
    ).toMatchObject({ codecName: 'opus', channelLayout: null })
  })
})
