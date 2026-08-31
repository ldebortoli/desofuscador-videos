import { execFile } from 'node:child_process'
import { access, mkdir, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app, type BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { CapCutInspector } from './capcutInspector'
import {
  BdveDeobfuscator,
  nextAvailableOutputPath,
  normalizeOutputName,
  resolveOutputFolder,
  type ToolExecutor
} from './deobfuscator'
import { resolveFfprobePath } from './ffprobeRunner'
import { trashFolderContents } from './folderCleanup'
import { OutputFolderSettings } from './outputFolderSettings'

const safePath = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 1 || value.length > 32_767)
    throw new Error('La ruta recibida no es valida')
  return value
}

const channels = [
  'inspector:scan',
  'inspector:reveal',
  'inspector:copy-path',
  'inspector:get-output-folder',
  'inspector:choose-output-folder',
  'inspector:open-output-folder',
  'inspector:deobfuscate',
  'inspector:empty-folder'
] as const

const executeTool: ToolExecutor = (executable, arguments_, options, callback) =>
  execFile(executable, arguments_, { ...options, encoding: 'utf8' }, (error, stdout, stderr) =>
    callback(error, stdout, stderr)
  )

function terminateProcessTree(child: import('node:child_process').ChildProcess): void {
  if (!child.pid) {
    child.kill()
    return
  }
  const taskkill = join(process.env['WINDIR'] ?? 'C:\\Windows', 'System32', 'taskkill.exe')
  execFile(taskkill, ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, (error) => {
    if (error) child.kill()
  })
}

function scriptPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'tools', 'Desofuscar-Video.ps1')
    : join(__dirname, '../../resources/Desofuscar-Video.ps1')
}

function powerShellPath(): string {
  return join(process.env['WINDIR'] ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch (reason) {
    if (reason && typeof reason === 'object' && 'code' in reason && reason.code === 'ENOENT') return false
    throw reason
  }
}

async function ensureOutputFolder(settings: OutputFolderSettings): Promise<string> {
  const path = await settings.get()
  await mkdir(path, { recursive: true })
  return path
}

export function registerIpc(parentWindow: BrowserWindow): () => void {
  const inspector = new CapCutInspector(process.env['CCI_LOCAL_APP_DATA'] ?? process.env['LOCALAPPDATA'])
  const outputSettings = new OutputFolderSettings(
    join(app.getPath('userData'), 'output-settings.json'),
    resolveOutputFolder(app.getPath('home'), process.env['CCI_OUTPUT_DIRECTORY'])
  )
  let fileActionInProgress = false
  const deobfuscator = new BdveDeobfuscator({
    powerShellPath: powerShellPath(),
    scriptPath: scriptPath(),
    ffprobePath: resolveFfprobePath(),
    execute: executeTool,
    terminate: terminateProcessTree
  })
  ipcMain.handle('inspector:scan', () => inspector.scan())
  ipcMain.handle('inspector:reveal', async (_event, value: unknown) => {
    shell.showItemInFolder(await inspector.resolveRevealableFile(safePath(value)))
  })
  ipcMain.handle('inspector:copy-path', (_event, value: unknown) => {
    clipboard.writeText(safePath(value))
  })
  ipcMain.handle('inspector:get-output-folder', () => outputSettings.get())
  ipcMain.handle('inspector:choose-output-folder', async () => {
    if (fileActionInProgress || deobfuscator.isRunning) throw new Error('Ya hay una accion de archivo en curso')
    fileActionInProgress = true
    try {
      const currentFolder = await outputSettings.get()
      const selection = await dialog.showOpenDialog(parentWindow, {
        title: 'Elegir carpeta de salida',
        defaultPath: currentFolder,
        buttonLabel: 'Usar esta carpeta',
        properties: ['openDirectory', 'createDirectory']
      })
      const selectedFolder = selection.filePaths[0]
      if (selection.canceled || !selectedFolder) {
        return { status: 'cancelled' as const, folderPath: currentFolder }
      }
      return { status: 'completed' as const, folderPath: await outputSettings.set(selectedFolder) }
    } finally {
      fileActionInProgress = false
    }
  })
  ipcMain.handle('inspector:open-output-folder', async () => {
    const error = await shell.openPath(await ensureOutputFolder(outputSettings))
    if (error) throw new Error(error)
  })
  ipcMain.handle('inspector:deobfuscate', async (_event, value: unknown, requestedName: unknown) => {
    if (fileActionInProgress) throw new Error('Ya hay una accion de archivo en curso')
    fileActionInProgress = true
    try {
      const inputPath = await inspector.resolveRevealableFile(safePath(value))
      const folderPath = await ensureOutputFolder(outputSettings)
      const fileName = normalizeOutputName(inputPath, requestedName)
      const outputPath = await nextAvailableOutputPath(folderPath, fileName, pathExists)

      await deobfuscator.run(inputPath, outputPath)
      shell.showItemInFolder(outputPath)
      return { status: 'completed' as const, outputPath }
    } finally {
      fileActionInProgress = false
    }
  })
  ipcMain.handle('inspector:empty-folder', async (_event, value: unknown) => {
    if (fileActionInProgress || deobfuscator.isRunning) throw new Error('Ya hay una accion de archivo en curso')
    fileActionInProgress = true
    try {
      const inputPath = await inspector.resolveRevealableFile(safePath(value))
      const folderPath = dirname(inputPath)
      const preview = await readdir(folderPath)
      const confirmation = await dialog.showMessageBox(parentWindow, {
        type: 'warning',
        title: 'Limpiar el contenido de la carpeta',
        message: '¿Enviar todo el contenido de esta carpeta a la Papelera?',
        detail: `Carpeta exacta:\n${folderPath}\n\nSe enviaran ${preview.length} elementos a la Papelera. El archivo detectado y cualquier otro contenido de esta carpeta dejaran de estar disponibles para CapCut.`,
        buttons: ['Cancelar', 'Enviar todo a la Papelera'],
        defaultId: 0,
        cancelId: 0,
        noLink: true
      })
      if (confirmation.response !== 1) return { status: 'cancelled' as const }

      const revalidatedInput = await inspector.resolveRevealableFile(inputPath)
      if (dirname(revalidatedInput) !== folderPath)
        throw new Error('La carpeta detectada cambio; busca el archivo de nuevo')
      const removedCount = await trashFolderContents(
        folderPath,
        (path) => readdir(path),
        (path) => shell.trashItem(path)
      )
      return { status: 'completed' as const, removedCount }
    } finally {
      fileActionInProgress = false
    }
  })

  return (): void => {
    deobfuscator.cancel()
    for (const channel of channels) ipcMain.removeHandler(channel)
  }
}
