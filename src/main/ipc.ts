import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app, type BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { CapCutInspector } from './capcutInspector'
import { BdveDeobfuscator, suggestedOutputName, type ToolExecutor } from './deobfuscator'
import { resolveFfprobePath } from './ffprobeRunner'
import { trashFolderContents } from './folderCleanup'

const safePath = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 1 || value.length > 32_767)
    throw new Error('La ruta recibida no es valida')
  return value
}

const channels = [
  'inspector:scan',
  'inspector:reveal',
  'inspector:copy-path',
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

export function registerIpc(parentWindow: BrowserWindow): () => void {
  const inspector = new CapCutInspector(process.env['CCI_LOCAL_APP_DATA'] ?? process.env['LOCALAPPDATA'])
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
  ipcMain.handle('inspector:deobfuscate', async (_event, value: unknown) => {
    if (fileActionInProgress) throw new Error('Ya hay una accion de archivo en curso')
    fileActionInProgress = true
    try {
      const inputPath = await inspector.resolveRevealableFile(safePath(value))
      const selection = await dialog.showSaveDialog(parentWindow, {
        title: 'Guardar video desofuscado',
        defaultPath: join(app.getPath('videos'), suggestedOutputName(inputPath)),
        buttonLabel: 'Desofuscar y guardar',
        filters: [{ name: 'Video MP4', extensions: ['mp4'] }],
        properties: ['showOverwriteConfirmation', 'createDirectory']
      })
      if (selection.canceled || !selection.filePath) return { status: 'cancelled' as const }

      await deobfuscator.run(inputPath, selection.filePath)
      shell.showItemInFolder(selection.filePath)
      return { status: 'completed' as const, outputPath: selection.filePath }
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
        title: 'Eliminar todo el contenido',
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
