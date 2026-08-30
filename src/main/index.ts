import { join } from 'node:path'
import { app, BrowserWindow, session, shell } from 'electron'
import { electronApp, is } from '@electron-toolkit/utils'
import { registerIpc } from './ipc'

app.setName('Clip Cache Inspector')
if (process.env['CCI_E2E_USER_DATA_DIR']) app.setPath('userData', process.env['CCI_E2E_USER_DATA_DIR'])

let mainWindow: BrowserWindow | null = null
const appId = 'com.local.clipcacheinspector'
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

function iconPath(): string {
  return app.isPackaged ? join(process.resourcesPath, 'build', 'icon.ico') : join(__dirname, '../../build/icon.ico')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 840,
    minHeight: 620,
    center: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#120f0e',
    title: 'Clip Cache Inspector',
    icon: iconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  registerIpc()
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
    app.quit()
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const developmentUrl =
      is.dev && process.env['ELECTRON_RENDERER_URL'] && url.startsWith(process.env['ELECTRON_RENDERER_URL'])
    if (!developmentUrl && !url.startsWith('file://')) event.preventDefault()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

void app
  .whenReady()
  .then(() => {
    electronApp.setAppUserModelId(appId)
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    createWindow()
  })
  .catch(() => app.quit())

app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.on('window-all-closed', () => app.quit())
