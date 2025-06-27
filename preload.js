const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectResourceFolder: () => ipcRenderer.invoke('select-resource-folder'),
  getStoredResourceFolder: () => ipcRenderer.invoke('get-stored-resource-folder'),
  loadPresetsFromResource: (folderPath) => ipcRenderer.invoke('load-presets-from-resource', folderPath),
  applyPresetToFile: (filePath, preset) => ipcRenderer.invoke('apply-preset-to-file', filePath, preset),
  saveJsonToFile: (data) => ipcRenderer.invoke('save-json-to-file', data),
  loadJsonFromFile: (data) => ipcRenderer.invoke('load-json-from-file', data),
  syncPresetsFromServer: (apiToken, serverHost) => ipcRenderer.invoke('sync-presets-from-server', apiToken, serverHost),
  syncPresetsToServer: (data, apiToken, serverHost) => ipcRenderer.invoke('sync-presets-to-server', data, apiToken, serverHost),
  clearResourcePath: () => ipcRenderer.invoke('clear-resource-path'),
});
