const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { parsePresetsFromFile } = require('./parser.js');
const { updatePresetInFile } = require('./paster.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('select-resource-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const resourceRoot = result.filePaths[0];
  const presetDir = path.join(resourceRoot, 'set', 'multiplayer', 'games', 'presets');

  if (!fs.existsSync(presetDir)) {
    return { error: `'presets' folder not found at expected path:\n${presetDir}` };
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

ipcMain.handle('apply-preset-to-file', async (_, filePath, preset) => {
  try {
    await updatePresetInFile(filePath, preset);
    return { success: true };
  } catch (err) {
    throw new Error(`Update failed: ${err.message}`);
  }
});