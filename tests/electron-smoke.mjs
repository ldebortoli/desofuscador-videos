import { dirname, join, resolve } from 'node:path'
import { access, mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { _electron as electron } from 'playwright-core'

const projectRoot = resolve(import.meta.dirname, '..')
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'desofuscador-videos-e2e-'))
const localAppData = join(temporaryDirectory, 'local-app-data')
const outputDirectory = join(temporaryDirectory, 'videos', 'Cortos')
const alternateOutputDirectory = join(temporaryDirectory, 'salida-elegida')
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
const actionsScreenshotPath = join(projectRoot, '.codex', 'qa-actions.png')
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
    CCI_LOCAL_APP_DATA: localAppData,
    CCI_OUTPUT_DIRECTORY: outputDirectory
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
  if (
    !(await page.evaluate(() =>
      Boolean(
        window.inspector?.scan &&
        window.inspector?.deobfuscate &&
        window.inspector?.emptyFolder &&
        window.inspector?.chooseOutputFolder &&
        window.inspector?.openOutputFolder
      )
    ))
  )
    throw new Error('El preload aislado no expuso la API')
  await app.evaluate(({ dialog, ipcMain, shell }, selectedOutput) => {
    shell.__clipCacheRevealedPaths = []
    shell.__clipCacheTrashedPaths = []
    shell.__clipCacheOpenedPaths = []
    shell.__clipCacheDeobfuscations = []
    shell.showItemInFolder = (path) => {
      shell.__clipCacheRevealedPaths.push(path)
    }
    shell.trashItem = async (path) => {
      shell.__clipCacheTrashedPaths.push(path)
    }
    shell.openPath = async (path) => {
      shell.__clipCacheOpenedPaths.push(path)
      return ''
    }
    ipcMain.removeHandler('inspector:deobfuscate')
    ipcMain.handle('inspector:deobfuscate', async (_event, path, outputName) => {
      shell.__clipCacheDeobfuscations.push({ path, outputName })
      return { status: 'completed', outputPath: 'C:\\Videos\\Cortos\\corto-e2e.mp4' }
    })
    dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false })
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selectedOutput] })
  }, alternateOutputDirectory)

  await page.getByTestId('detected-file-name').filter({ hasText: 'efecto-control-e2e.mp4' }).waitFor()
  await page.getByText(outputDirectory).waitFor()
  await page.getByText('Salida MP4 / H.264 de 8 bits. Nombre con o sin .mp4.').waitFor()
  await page.getByTestId('media-analysis-status').filter({ hasText: 'Incompleto' }).waitFor()
  await page.getByText(/estructura MP4 analizable|bloque moov/i).waitFor()
  await page.locator('.file-card').screenshot({ path: actionsScreenshotPath })
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await page.setViewportSize({ width: 840, height: 620 })
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  if (horizontalOverflow) throw new Error('La guia produce desborde horizontal en ancho compacto')
  const actionRows = await page
    .locator('.actions button')
    .evaluateAll((buttons) => [...new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top)))])
  if (actionRows.length !== 1) throw new Error('Los cinco botones de archivo no quedaron en una sola fila')
  await page.screenshot({ path: compactScreenshotPath, fullPage: true })
  await page.getByRole('button', { name: 'Abrir', exact: true }).click()
  await page.getByText('Carpeta abierta y archivo seleccionado').waitFor()
  const revealedPaths = await app.evaluate(({ shell }) => shell.__clipCacheRevealedPaths)
  if (!revealedPaths.includes(filePath)) throw new Error('No se revelo el MP4 exacto')

  await page.getByRole('button', { name: 'Ruta' }).click()
  const copied = await app.evaluate(({ clipboard }) => clipboard.readText())
  if (copied !== filePath) throw new Error('No se copio la ruta exacta')

  await page.getByRole('textbox', { name: /nombre de salida/i }).fill('corto-e2e')
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('inspector:deobfuscate')
    ipcMain.handle('inspector:deobfuscate', async () => {
      throw new Error('No se pudo analizar el indice MP4. El original no se modifico.')
    })
  })
  await page.getByRole('button', { name: 'Desofuscar' }).click()
  await page.getByText('No se pudo analizar el indice MP4. El original no se modifico.', { exact: true }).waitFor()
  if (await page.getByText(/Error invoking remote method/).count())
    throw new Error('La UI expuso el error interno de IPC')
  await app.evaluate(({ ipcMain, shell }) => {
    ipcMain.removeHandler('inspector:deobfuscate')
    ipcMain.handle('inspector:deobfuscate', async (_event, path, outputName) => {
      shell.__clipCacheDeobfuscations.push({ path, outputName })
      return { status: 'completed', outputPath: 'C:\\Videos\\Cortos\\corto-e2e.mp4' }
    })
  })
  await page.getByRole('button', { name: 'Desofuscar' }).click()
  await page.getByText('Video guardado en la carpeta de salida y seleccionado en Explorer').waitFor()
  const deobfuscations = await app.evaluate(({ shell }) => shell.__clipCacheDeobfuscations)
  if (
    deobfuscations.length !== 1 ||
    deobfuscations[0].path !== filePath ||
    deobfuscations[0].outputName !== 'corto-e2e'
  ) {
    throw new Error('El nombre opcional no llego al proceso principal')
  }

  await page.getByRole('button', { name: 'Cambiar' }).click()
  await page.getByText(alternateOutputDirectory).waitFor()
  await page.getByText('Carpeta de salida actualizada').waitFor()

  await page.getByRole('button', { name: 'Abrir salida' }).click()
  await page.getByText('Carpeta de salida abierta').waitFor()
  const openedPaths = await app.evaluate(({ shell }) => shell.__clipCacheOpenedPaths)
  if (!openedPaths.includes(alternateOutputDirectory)) throw new Error('No se abrio la carpeta de salida elegida')

  await page.getByRole('button', { name: 'Limpiar carpeta' }).click()
  await page.getByText('Eliminacion cancelada; no se movio ningun archivo').waitFor()
  await access(filePath)
  const trashedPaths = await app.evaluate(({ shell }) => shell.__clipCacheTrashedPaths)
  if (trashedPaths.length !== 0) throw new Error('La cancelacion intento eliminar contenido')

  await rm(filePath)
  await page.getByRole('button', { name: 'Buscar de nuevo' }).click()
  await page.getByRole('heading', { name: 'Todavia no aparece ningun MP4' }).waitFor()

  const title = await page.title()
  const bounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getBounds())
  if (title !== 'Desofuscador Videos' || !bounds || bounds.width < 840 || bounds.height < 620) {
    throw new Error('La ventana no conservo identidad o dimensiones minimas')
  }
  console.log(
    `Electron smoke OK: salida configurable, fila de acciones, revelado, copia, vacio y screenshot en ${screenshotPath}`
  )
} finally {
  await app.close()
  await rm(temporaryDirectory, { recursive: true, force: true })
}
