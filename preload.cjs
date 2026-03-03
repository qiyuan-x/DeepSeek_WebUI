const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startServer: (options) => ipcRenderer.invoke('start-server', options),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  onServerStatus: (callback) => ipcRenderer.on('server-status', (event, status) => callback(status)),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  quit: () => ipcRenderer.send('quit-app')
});
