const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readData: () => ipcRenderer.invoke('read-data'),
  writeData: (data) => ipcRenderer.invoke('write-data', data),
  closeWindow: () => ipcRenderer.send('win-close'),
  minimizeWindow: () => ipcRenderer.send('win-minimize'),
  toggleZoom: () => ipcRenderer.send('win-toggle-zoom'),
  togglePin: () => ipcRenderer.send('win-toggle-pin'),
  repaint: () => ipcRenderer.send('repaint'),
});
