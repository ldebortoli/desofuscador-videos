import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const rendererStyles = new URL('../src/renderer/src/styles.css', import.meta.url)
const windowsIcon = new URL('../build/icon.svg', import.meta.url)

describe('identidad cromatica', () => {
  it('usa la paleta cobre y elimina el turquesa anterior de la interfaz y el icono', async () => {
    const [styles, icon] = await Promise.all([readFile(rendererStyles, 'utf8'), readFile(windowsIcon, 'utf8')])

    expect(styles).toContain('--bg: #120f0e')
    expect(styles).toContain('--accent: #c7895d')
    expect(icon).toContain('stroke="#c7895d"')

    for (const source of [styles, icon]) {
      expect(source).not.toMatch(/#76b8b6|rgba\(118,\s*184,\s*182/iu)
    }
  })
})
