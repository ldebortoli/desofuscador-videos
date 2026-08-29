import { contextBridge, ipcRenderer } from 'electron'
import type { InspectorApi } from '../shared/types'

const api: InspectorApi = {
  scan: () => ipcRenderer.invoke('inspector:scan'),
  reveal: (path) => ipcRenderer.invoke('inspector:reveal', path),
  copyPath: (path) => ipcRenderer.invoke('inspector:copy-path', path)
}

contextBridge.exposeInMainWorld('inspector', api)
