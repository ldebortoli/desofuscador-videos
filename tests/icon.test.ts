import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const windowsIcon = new URL('../build/icon.ico', import.meta.url)
const shortcutInstaller = new URL('../scripts/Install-WindowsShortcut.ps1', import.meta.url)

function frameDimensions(value: number): number {
  return value === 0 ? 256 : value
}

describe('icono de Windows', () => {
  it('mantiene las cuatro esquinas totalmente transparentes en todos sus tamanos', async () => {
    const icon = await readFile(windowsIcon)
    const frameCount = icon.readUInt16LE(4)

    expect(frameCount).toBe(6)

    for (let index = 0; index < frameCount; index += 1) {
      const entryOffset = 6 + index * 16
      const width = frameDimensions(icon.readUInt8(entryOffset))
      const height = frameDimensions(icon.readUInt8(entryOffset + 1))
      const imageOffset = icon.readUInt32LE(entryOffset + 12)
      const headerSize = icon.readUInt32LE(imageOffset)
      const bitsPerPixel = icon.readUInt16LE(imageOffset + 14)
      const compression = icon.readUInt32LE(imageOffset + 16)
      const pixelsOffset = imageOffset + headerSize

      expect(bitsPerPixel).toBe(32)
      expect(compression).toBe(0)

      const alphaAt = (x: number, y: number): number => {
        const storedRow = height - 1 - y
        return icon.readUInt8(pixelsOffset + (storedRow * width + x) * 4 + 3)
      }

      expect([alphaAt(0, 0), alphaAt(width - 1, 0), alphaAt(0, height - 1), alphaAt(width - 1, height - 1)]).toEqual([
        0, 0, 0, 0
      ])
      expect(alphaAt(Math.floor(width / 2), Math.floor(height / 2))).toBeGreaterThan(0)
    }
  })

  it('usa el ejecutable versionado como fuente para evitar iconos cacheados', async () => {
    const installer = await readFile(shortcutInstaller, 'utf8')

    expect(installer).toContain('$shortcut.IconLocation = "$artifact,0"')
    expect(installer).toContain("-ArgumentList '-show'")
  })
})
