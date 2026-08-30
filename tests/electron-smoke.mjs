import { dirname, join, resolve } from 'node:path'
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { _electron as electron } from 'playwright-core'

const projectRoot = resolve(import.meta.dirname, '..')
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'clip-cache-inspector-e2e-'))
const localAppData = join(temporaryDirectory, 'local-app-data')
const filePath = join(
  localAppData,
  'CapCut',
  'User Data',
  'Presets',
  'Combination',
  'Resources',
  'efecto-control-e2e.mp4'
)
const screenshotPath = join(projectRoot, '.codex', 'qa-main.png')
const compactScreenshotPath = join(projectRoot, '.codex', 'qa-compact.png')
const executablePath = process.env.CCI_E2E_EXECUTABLE
  ? resolve(process.env.CCI_E2E_EXECUTABLE)
  : join(projectRoot, 'node_modules', 'electron', 'dist', 'electron.exe')

await mkdir(dirname(filePath), { recursive: true })
await writeFile(filePath, 'mp4-control-e2e')
await utimes(filePath, new Date('2026-08-29T13:00:00.000Z'), new Date('2026-08-29T13:00:00.000Z'))

const app = await electron.launch({
  executablePath,
  args: process.env.CCI_E2E_EXECUTABLE ? [] : [projectRoot],
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    CCI_E2E_USER_DATA_DIR: join(temporaryDirectory, 'user-data'),
    CCI_LOCAL_APP_DATA: localAppData
  }
})

try {
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('heading', { name: 'Encuentra el MP4 que genero CapCut' }).waitFor({ timeout: 15_000 })
  await page.getByRole('heading', { name: 'Guia rapida de exportacion' }).waitFor()
  const officialGuide = await page.getByRole('link', { name: 'Guia oficial de CapCut' }).getAttribute('href')
  if (officialGuide !== 'https://www.capcut.com/help/export-videos-in-capcut') {
    throw new Error('La guia no conserva el enlace oficial esperado')
  }
  if (!(await page.evaluate(() => Boolean(window.inspector?.scan))))
    throw new Error('El preload aislado no expuso la API')
  await app.evaluate(({ shell }) => {
    shell.__clipCacheRevealedPaths = []
    shell.showItemInFolder = (path) => {
      shell.__clipCacheRevealedPaths.push(path)
    }
  })

  await page.getByTestId('detected-file-name').filter({ hasText: 'efecto-control-e2e.mp4' }).waitFor()
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await page.setViewportSize({ width: 840, height: 620 })
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  if (horizontalOverflow) throw new Error('La guia produce desborde horizontal en ancho compacto')
  await page.screenshot({ path: compactScreenshotPath, fullPage: true })
  await page.getByRole('button', { name: 'Abrir carpeta' }).click()
  await page.getByText('Carpeta abierta y archivo seleccionado').waitFor()
  const revealedPaths = await app.evaluate(({ shell }) => shell.__clipCacheRevealedPaths)
  if (!revealedPaths.includes(filePath)) throw new Error('No se revelo el MP4 exacto')

  await page.getByRole('button', { name: 'Copiar ruta' }).click()
  const copied = await app.evaluate(({ clipboard }) => clipboard.readText())
  if (copied !== filePath) throw new Error('No se copio la ruta exacta')

  await rm(filePath)
  await page.getByRole('button', { name: 'Buscar de nuevo' }).click()
  await page.getByRole('heading', { name: 'Todavia no aparece ningun MP4' }).waitFor()

  const title = await page.title()
  const bounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getBounds())
  if (title !== 'Clip Cache Inspector' || !bounds || bounds.width < 840 || bounds.height < 620) {
    throw new Error('La ventana no conservo identidad o dimensiones minimas')
  }
  console.log(`Electron smoke OK: deteccion, revelado, copia, vacio y screenshot en ${screenshotPath}`)
} finally {
  await app.close()
  await rm(temporaryDirectory, { recursive: true, force: true })
}
