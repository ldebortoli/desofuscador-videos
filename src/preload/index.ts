import { contextBridge, ipcRenderer } from 'electron'
import type { InspectorApi } from '../shared/types'

const api: InspectorApi = {
  scan: () => ipcRenderer.invoke('inspector:scan'),
  reveal: (path) => ipcRenderer.invoke('inspector:reveal', path),
  copyPath: (path) => ipcRenderer.invoke('inspector:copy-path', path),
  getOutputFolder: () => ipcRenderer.invoke('inspector:get-output-folder'),
  openOutputFolder: () => ipcRenderer.invoke('inspector:open-output-folder'),
  deobfuscate: (path, outputName) => ipcRenderer.invoke('inspector:deobfuscate', path, outputName),
  emptyFolder: (path) => ipcRenderer.invoke('inspector:empty-folder', path)
}

contextBridge.exposeInMainWorld('inspector', api)
