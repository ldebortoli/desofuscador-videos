import { join } from 'node:path'
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { describe, expect, test, vi } from 'vitest'
import { trashFolderContents } from '../src/main/folderCleanup'

describe('vaciado recuperable de la carpeta detectada', () => {
  test('no intenta eliminar nada cuando la carpeta ya esta vacia', async () => {
    const trashItem = vi.fn<(path: string) => Promise<void>>()

    await expect(trashFolderContents('C:\\cache', async () => [], trashItem)).resolves.toBe(0)
    expect(trashItem).not.toHaveBeenCalled()
  })

  test('envia cada hijo a la Papelera y conserva la carpeta contenedora', async () => {
    const folder = 'C:\\cache\\Resources'
    const trashItem = vi.fn<(path: string) => Promise<void>>().mockResolvedValue(undefined)

    await expect(trashFolderContents(folder, async () => ['video.mp4', 'miniaturas'], trashItem)).resolves.toBe(2)
    expect(trashItem).toHaveBeenNthCalledWith(1, join(folder, 'video.mp4'))
    expect(trashItem).toHaveBeenNthCalledWith(2, join(folder, 'miniaturas'))
    expect(trashItem).not.toHaveBeenCalledWith(folder)
  })

  test('vacia un arbol temporal completo sin quitar su carpeta raiz', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'clip-cache-cleanup-'))
    const folder = join(testRoot, 'Resources')
    await mkdir(join(folder, 'miniaturas'), { recursive: true })
    await writeFile(join(folder, 'video.mp4'), 'video')
    await writeFile(join(folder, 'miniaturas', 'frame.jpg'), 'frame')

    try {
      await expect(
        trashFolderContents(
          folder,
          (path) => readdir(path),
          (path) => rm(path, { recursive: true, force: true })
        )
      ).resolves.toBe(2)
      expect((await stat(folder)).isDirectory()).toBe(true)
      await expect(readdir(folder)).resolves.toEqual([])
    } finally {
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  test('continua con los demas hijos y describe una eliminacion parcial', async () => {
    const trashItem = vi
      .fn<(path: string) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('archivo en uso'))
      .mockRejectedValueOnce(new Error('sin acceso'))

    const result = trashFolderContents('C:\\cache', async () => ['uno', 'dos', 'tres'], trashItem)
    await expect(result).rejects.toMatchObject({
      name: 'FolderCleanupError',
      removedCount: 1,
      failedCount: 2,
      message: expect.stringContaining('Se enviaron 1 elementos')
    })
    expect(trashItem).toHaveBeenCalledTimes(3)
  })

  test('rechaza nombres que resolverian a la carpeta raiz o fuera de ella', async () => {
    const folder = 'C:\\cache'
    const trashItem = vi.fn<(path: string) => Promise<void>>().mockResolvedValue(undefined)

    await expect(trashFolderContents(folder, async () => ['', '..', 'video.mp4'], trashItem)).rejects.toMatchObject({
      removedCount: 1,
      failedCount: 2
    })
    expect(trashItem).toHaveBeenCalledOnce()
    expect(trashItem).toHaveBeenCalledWith(join(folder, 'video.mp4'))
    expect(trashItem).not.toHaveBeenCalledWith(folder)
  })
})
