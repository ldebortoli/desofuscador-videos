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
    size: 2_621_440
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
  test('muestra el nombre y metadata del archivo detectado', async () => {
    render(<App />)

    expect(await screen.findByTestId('detected-file-name')).toHaveTextContent('efecto-detectado.mp4')
    expect(screen.getAllByText('Combinaciones preestablecidas')).toHaveLength(2)
    expect(screen.getByText('2.5 MB')).toBeInTheDocument()
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
