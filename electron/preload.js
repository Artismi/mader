const { contextBridge, ipcRenderer, webFrame } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls (per titlebar custom)
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close:    () => ipcRenderer.invoke('window:close'),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // OAuth popup
  openOAuthWindow: (url) => ipcRenderer.invoke('auth:openOAuthWindow', url),

  // Platform info
  platform: process.platform,
  isElectron: true,

  // Zoom controls (via IPC to main process)
  setZoomFactor: (factor) => ipcRenderer.invoke('window:setZoomFactor', factor),
  getZoomFactor: () => ipcRenderer.invoke('window:getZoomFactor'),
})
