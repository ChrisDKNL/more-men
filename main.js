const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { parsePresetsFromFile } = require('./parser.js');
const { updatePresetInFile } = require('./paster.js');
const axios = require('axios');
const { log } = require('console');


// Electron store test
let store;

(async () => {
  const Store = (await import('electron-store')).default;
  store = new Store();
})();

ipcMain.handle('select-resource-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const resourceRoot = result.filePaths[0];

  // Save folder path
  store.set('resourcePath', resourceRoot);

  return resourceRoot;
});

ipcMain.handle('get-stored-resource-folder', () => {
  return store.get('resourcePath', null);
});




// -----------------------------------------------------------------------------------------------------------------------------------------------------------------
let mainWindow;
let splash;

function createWindow() {
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#1e1e1e',
    show: true,
  });

  splash.loadFile('splash.html');

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      splash.close();       // Hide splash after main window is ready
      mainWindow.show();
    }, 200); // Optional: short delay to ensure smooth transition
  });
}

app.whenReady().then(createWindow);

ipcMain.handle('apply-preset-to-file', async (_, filePath, preset) => {
  try {
    await updatePresetInFile(filePath, preset);
    return { success: true };
  } catch (err) {
    throw new Error(`Update failed: ${err.message}`);
  }
});


ipcMain.handle('save-json-to-file', async (event, data) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Changes',
    defaultPath: 'presets-changes.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (filePath) {
    await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  }
  return { cancelled: true };
});

ipcMain.handle('load-json-from-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Load Changes',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) return null;

  const content = await fsp.readFile(filePaths[0], 'utf8');
  return JSON.parse(content);
});

ipcMain.handle('sync-presets-to-server', async (_, data) => {
  console.log('Received data in main:', data);  // Debug: check what you get
  try {
    const response = await axios.post('http://localhost:3000/upload-presets', data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (err) {
    throw new Error(`Upload failed: ${err.message}`);
  }
});

ipcMain.handle('sync-presets-from-server', async () => {
  try {
    const response = await axios.get('http://localhost:3000/download-presets');
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      // Server is not running
      throw new Error('Cannot connect to server. Is it running?');
    }
    throw new Error(`Download failed: ${err.message}`);
  }
});

ipcMain.handle('load-presets-from-resource', async (_, resourceRoot) => {
  console.log(`Loading presets from: ${resourceRoot}`);
  const presetDir = path.join(resourceRoot, 'set', 'multiplayer', 'games', 'presets');

  if (!fs.existsSync(presetDir)) {
    return { error: `'presets' folder not found:\n${presetDir}` };
  }

  const fileMap = {};
  const files = fs.readdirSync(presetDir).filter(f => f.endsWith('.inc'));

  for (const fileName of files) {
    const fullPath = path.join(presetDir, fileName);
    try {
      const presets = parsePresetsFromFile(fullPath);
      fileMap[fileName] = { filePath: fullPath, presets };
    } catch (err) {
      fileMap[fileName] = { error: `Failed to parse: ${err.message}` };
    }
  }

  return fileMap;
});

ipcMain.handle('clear-resource-path', () => {
  store.delete('resourcePath');
});