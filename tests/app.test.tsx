/* @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import App from '../src/renderer/src/App'
import type { ScanResult } from '../src/shared/types'

const scan = vi.fn<() => Promise<ScanResult>>()
const reveal = vi.fn<(path: string) => Promise<void>>()
const copyPath = vi.fn<(path: string) => Promise<void>>()

const populated: ScanResult = {
  file: {
    fileName: 'efecto-detectado.mp4',
    filePath: 'C:\\CapCut\\User Data\\Presets\\Combination\\Resources\\efecto-detectado.mp4',
    source: 'preset-combination',
    sourceLabel: 'Combinaciones preestablecidas',
    modifiedAt: '2026-08-29T13:00:00.000Z',
    size: 2_621_440,
    media: {
      status: 'ready',
      detail: 'Analisis multimedia completado.',
      container: 'QuickTime / MOV',
      durationSeconds: 62.4,
      bitRate: 8_250_000,
      video: {
        codecName: 'h264',
        codecLongName: 'H.264 / AVC / MPEG-4 AVC',
        profile: 'High',
        width: 1920,
        height: 1080,
        frameRate: 29.97,
        pixelFormat: 'yuv420p',
        bitRate: 8_000_000
      },
      audio: {
        codecName: 'aac',
        codecLongName: 'AAC (Advanced Audio Coding)',
        profile: 'LC',
        sampleRate: 48_000,
        channels: 2,
        channelLayout: 'stereo',
        bitRate: 250_000
      }
    }
  },
  locations: [
    { source: 'project-combination', label: 'Recursos del proyecto', path: 'C:\\CapCut\\Projects', available: true },
    {
      source: 'preset-combination',
      label: 'Combinaciones preestablecidas',
      path: 'C:\\CapCut\\Presets',
      available: true
    },
    { source: 'motion-blur', label: 'Cache de desenfoque de movimiento', path: 'C:\\CapCut\\Cache', available: false }
  ]
}

beforeEach(() => {
  scan.mockReset().mockResolvedValue(populated)
  reveal.mockReset().mockResolvedValue(undefined)
  copyPath.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(window, 'inspector', { configurable: true, value: { scan, reveal, copyPath } })
})

describe('interfaz principal', () => {
  test('incluye una guia breve de exportacion legitima', async () => {
    render(<App />)
    await screen.findByTestId('detected-file-name')

    expect(screen.getByRole('heading', { name: 'Guia rapida de exportacion' })).toBeInTheDocument()
    expect(screen.getByText('Revisa el proyecto')).toBeInTheDocument()
    expect(screen.getByText('Configura el MP4')).toBeInTheDocument()
    expect(screen.getByText(/reemplazalos por alternativas gratuitas o usa una licencia activa/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Guia oficial de CapCut' })).toHaveAttribute(
      'href',
      'https://www.capcut.com/help/export-videos-in-capcut'
    )
  })

  test('muestra el nombre y metadata del archivo detectado', async () => {
    render(<App />)

    expect(await screen.findByTestId('detected-file-name')).toHaveTextContent('efecto-detectado.mp4')
    expect(screen.getAllByText('Combinaciones preestablecidas')).toHaveLength(2)
    expect(screen.getByText('2.5 MB')).toBeInTheDocument()
    expect(screen.getByTestId('media-analysis-status')).toHaveTextContent('Analizado')
    expect(screen.getByText('H.264 / AVC')).toBeInTheDocument()
    expect(screen.getByText('1920 x 1080')).toBeInTheDocument()
    expect(screen.getByText('29.97 FPS')).toBeInTheDocument()
    expect(screen.getByText('1:02')).toBeInTheDocument()
    expect(screen.getByText('8 Mb/s')).toBeInTheDocument()
    expect(screen.getByText('AAC')).toBeInTheDocument()
    expect(screen.getByText('48 kHz · stereo')).toBeInTheDocument()
    expect(screen.getAllByText('Disponible')).toHaveLength(2)
    expect(screen.getByText('No encontrada')).toBeInTheDocument()
  })

  test('abre la carpeta, copia la ruta y permite cerrar los avisos', async () => {
    render(<App />)
    await screen.findByTestId('detected-file-name')

    fireEvent.click(screen.getByRole('button', { name: 'Abrir carpeta' }))
    await waitFor(() => expect(reveal).toHaveBeenCalledWith(populated.file?.filePath))
    expect(screen.getByRole('status')).toHaveTextContent('Carpeta abierta')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

    fireEvent.click(screen.getByRole('button', { name: 'Copiar ruta' }))
    await waitFor(() => expect(copyPath).toHaveBeenCalledWith(populated.file?.filePath))
    expect(screen.getByRole('status')).toHaveTextContent('Ruta copiada')
  })

  test('presenta estado vacio y actualiza la busqueda', async () => {
    scan.mockResolvedValue({ file: null, locations: populated.locations })
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Todavia no aparece ningun MP4' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Buscar de nuevo' })[0]!)
    await waitFor(() => expect(scan).toHaveBeenCalledTimes(2))
  })

  test('explica cuando el MP4 interno esta incompleto', async () => {
    scan.mockResolvedValue({
      ...populated,
      file: populated.file
        ? {
            ...populated.file,
            media: {
              status: 'incomplete',
              detail: 'MP4 interno incompleto: falta el bloque moov.',
              container: null,
              durationSeconds: null,
              bitRate: null,
              video: null,
              audio: null
            }
          }
        : null
    })
    render(<App />)

    expect(await screen.findByTestId('media-analysis-status')).toHaveTextContent('Incompleto')
    expect(screen.getByText(/falta el bloque moov/i)).toBeInTheDocument()
  })

  test('muestra metadata recuperada del indice para un recurso interno de CapCut', async () => {
    scan.mockResolvedValue({
      ...populated,
      file: populated.file
        ? {
            ...populated.file,
            media: {
              ...populated.file.media,
              status: 'protected',
              detail: 'Metadatos leidos del indice local de CapCut. Es un recurso interno protegido.',
              container: 'MP4 (indice de CapCut)',
              durationSeconds: 11.7,
              video: populated.file.media.video
                ? { ...populated.file.media.video, width: 1080, height: 1920, frameRate: 30 }
                : null
            }
          }
        : null
    })
    render(<App />)

    expect(await screen.findByTestId('media-analysis-status')).toHaveTextContent('Interno CapCut')
    expect(screen.getByText(/recurso interno protegido/i)).toBeInTheDocument()
    expect(screen.getByText('1080 x 1920')).toBeInTheDocument()
    expect(screen.getByText('30 FPS')).toBeInTheDocument()
  })

  test('permite reintentar un error de busqueda', async () => {
    scan.mockRejectedValueOnce(new Error('CapCut no responde')).mockResolvedValueOnce(populated)
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('CapCut no responde')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByTestId('detected-file-name')).toBeInTheDocument()
  })

  test('informa errores al abrir y copiar', async () => {
    reveal.mockRejectedValue(new Error('El archivo desaparecio'))
    copyPath.mockRejectedValue(new Error('Portapapeles ocupado'))
    render(<App />)
    await screen.findByTestId('detected-file-name')

    fireEvent.click(screen.getByRole('button', { name: 'Abrir carpeta' }))
    expect(await screen.findByRole('status')).toHaveTextContent('El archivo desaparecio')
    fireEvent.click(screen.getByRole('button', { name: 'Copiar ruta' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Portapapeles ocupado')
  })
})
