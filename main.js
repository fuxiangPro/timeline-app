const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Paths ────────────────────────────────────────────────────
// Data lives in the OS userData dir (persists across upgrades, not in
// the install/source folder). On first run, migrate a legacy data.json
// that used to sit next to this file.
const DATA_FILE = path.join(app.getPath('userData'), 'data.json');
const DATA_BACKUP = path.join(app.getPath('userData'), 'data.backup.json');
const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');
const LEGACY_DATA_FILE = path.join(__dirname, 'data.json');

function migrateLegacyData() {
  try {
    if (!fs.existsSync(DATA_FILE) && fs.existsSync(LEGACY_DATA_FILE)) {
      fs.copyFileSync(LEGACY_DATA_FILE, DATA_FILE);
    }
  } catch (err) {
    console.warn('[timeline] legacy data migration failed:', err);
  }
}

// ── Window state persistence ───────────────────────────────────
const DEFAULT_WINDOW_STATE = { width: 960, height: 560 };

function loadWindowState() {
  try {
    if (!fs.existsSync(WINDOW_STATE_FILE)) return { ...DEFAULT_WINDOW_STATE };
    const parsed = JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf-8'));
    const state = { ...DEFAULT_WINDOW_STATE };
    if (typeof parsed.width === 'number' && parsed.width > 0) state.width = parsed.width;
    if (typeof parsed.height === 'number' && parsed.height > 0) state.height = parsed.height;
    if (typeof parsed.x === 'number') state.x = parsed.x;
    if (typeof parsed.y === 'number') state.y = parsed.y;
    if (typeof parsed.maximized === 'boolean') state.maximized = parsed.maximized;
    return state;
  } catch {
    return { ...DEFAULT_WINDOW_STATE };
  }
}

function saveWindowState(win) {
  try {
    const state = { ...DEFAULT_WINDOW_STATE };
    if (win.isMaximized()) {
      state.maximized = true;
    } else {
      const bounds = win.getBounds();
      state.x = bounds.x;
      state.y = bounds.y;
      state.width = bounds.width;
      state.height = bounds.height;
    }
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[timeline] failed to save window state:', err);
  }
}

// ── Window ────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
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

  if (state.maximized) mainWindow.maximize();

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.showInactive();
  });

  mainWindow.on('close', () => {
    saveWindowState(mainWindow);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Single instance lock ──────────────────────────────────────
app.whenReady().then(() => {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

  migrateLegacyData();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: data ──────────────────────────────────────────────────
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

ipcMain.handle('write-data', (_, data) => {
  try {
    // Keep the previous version as a backup before overwriting.
    if (fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, DATA_BACKUP);
    }
    // Atomic replace: write to a temp file first, then rename into place.
    const tmpFile = path.join(app.getPath('userData'), 'data.json.tmp');
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
    return true;
  } catch (err) {
    console.warn('[timeline] failed to write data:', err);
    return false;
  }
});

// ── IPC: window controls (operate on the window that sent the IPC) ──
ipcMain.on('win-close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});
ipcMain.on('win-minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});
ipcMain.on('win-toggle-zoom', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.on('win-toggle-pin', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  win.setAlwaysOnTop(!win.isAlwaysOnTop());
});
ipcMain.on('repaint', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.webContents.invalidate();
});
