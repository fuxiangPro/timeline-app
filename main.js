const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');


const DATA_FILE = path.join(__dirname, 'data.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 560,
    minWidth: 700,
    minHeight: 360,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: false,
    resizable: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.showInactive();
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: read data
ipcMain.handle('read-data', () => {
  if (!fs.existsSync(DATA_FILE)) {
    return { mainLines: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { mainLines: [] };
  }
});

// IPC: write data
ipcMain.handle('write-data', (_, data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});

// IPC: window controls
ipcMain.on('win-close', () => {
  BrowserWindow.getFocusedWindow()?.close();
});
ipcMain.on('win-minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});
ipcMain.on('repaint', () => {
  BrowserWindow.getAllWindows()[0]?.webContents.invalidate();
});

ipcMain.on('win-set-opacity', (_, value) => {
  const wins = BrowserWindow.getAllWindows();
  if (wins[0]) wins[0].setOpacity(value);
});
