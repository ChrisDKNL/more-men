const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectResourceFolder: () => ipcRenderer.invoke('select-resource-folder'),
  getStoredResourceFolder: () => ipcRenderer.invoke('get-stored-resource-folder'),
  loadPresetsFromResource: (folderPath) => ipcRenderer.invoke('load-presets-from-resource', folderPath),
  applyPresetToFile: (filePath, preset) => ipcRenderer.invoke('apply-preset-to-file', filePath, preset),
  saveJsonToFile: (data) => ipcRenderer.invoke('save-json-to-file', data),
  loadJsonFromFile: () => ipcRenderer.invoke('load-json-from-file'),
  syncPresetsFromServer: () => ipcRenderer.invoke('sync-presets-from-server'),
  syncPresetsToServer: () => ipcRenderer.invoke('sync-presets-to-server'),
  clearResourcePath: () => ipcRenderer.invoke('clear-resource-path'),
});
