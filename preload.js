const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readData: () => ipcRenderer.invoke('read-data'),
  writeData: (data) => ipcRenderer.invoke('write-data', data),
  closeWindow: () => ipcRenderer.send('win-close'),
  minimizeWindow: () => ipcRenderer.send('win-minimize'),
  setOpacity: (v) => ipcRenderer.send('win-set-opacity', v),
  repaint: () => ipcRenderer.send('repaint'),
});
