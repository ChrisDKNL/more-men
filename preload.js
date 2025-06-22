const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadPresetsFromResource: () => ipcRenderer.invoke('select-resource-folder'),
  applyPresetToFile: (filePath, preset) => ipcRenderer.invoke('apply-preset-to-file', filePath, preset),
  saveJsonToFile: (data) => ipcRenderer.invoke('save-json-to-file', data),
  loadJsonFromFile: () => ipcRenderer.invoke('load-json-from-file'),
});
