import { clipboard, ipcMain, shell } from 'electron'
import { CapCutInspector } from './capcutInspector'

const safePath = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 1 || value.length > 32_767)
    throw new Error('La ruta recibida no es valida')
  return value
}

export function registerIpc(): void {
  const inspector = new CapCutInspector(process.env['CCI_LOCAL_APP_DATA'] ?? process.env['LOCALAPPDATA'])
  ipcMain.handle('inspector:scan', () => inspector.scan())
  ipcMain.handle('inspector:reveal', async (_event, value: unknown) => {
    shell.showItemInFolder(await inspector.resolveRevealableFile(safePath(value)))
  })
  ipcMain.handle('inspector:copy-path', (_event, value: unknown) => {
    clipboard.writeText(safePath(value))
  })
}
