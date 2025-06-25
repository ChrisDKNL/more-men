let fileMap = {};
let currentPresets = [];
const modifiedConfigs = new Map(); // Maps preset.title to updated config


async function loadFromResource() {
  const resourcePath = await window.api.getStoredResourceFolder();
  if (resourcePath) {
    await loadPresetsFrom(resourcePath);
  }

  const result = await window.api.loadPresetsFromResource(resourcePath);
  if (!result) return;

  if (result.error) {
    alert(result.error);
    return;
  }

  fileMap = result;

  const fileSelector = document.getElementById('fileSelector');
  fileSelector.innerHTML = '';

  for (const [fileName, data] of Object.entries(fileMap)) {
    if (data.error) continue;
    // Add filePath to each preset object
    data.presets.forEach(preset => {
      preset.filePath = data.filePath;
    });
    const option = document.createElement('option');
    option.value = fileName;
    option.textContent = fileName;
    fileSelector.appendChild(option);
  }

  const firstValid = Object.keys(fileMap).find(name => !fileMap[name].error);
  if (firstValid) {
    fileSelector.value = firstValid;
    renderFile(firstValid);
  } else {
    document.getElementById('tabs').innerHTML = '';
    document.getElementById('tabContent').innerHTML = '<p>No valid presets found in folder.</p>';
  }
}

function handleFileSelect() {
  saveCurrentFormData(); // Save form before switching files
  const selectedFile = document.getElementById('fileSelector').value;
  renderFile(selectedFile);
}


function renderFile(fileName) {
  const { presets } = fileMap[fileName];
  currentPresets = presets;
  renderTabs(presets);
}

function renderTabs(presets) {
  const tabsContainer = document.getElementById('tabs');
  const tabContent = document.getElementById('tabContent');

  tabsContainer.innerHTML = '';
  tabContent.innerHTML = '';

  presets.forEach((preset, index) => {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.textContent = preset.title;
    tab.dataset.index = index;

    tab.addEventListener('click', () => {
      // 💾 Save current tab's form data before switching
      saveCurrentFormData();

      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showPresetContent(presets[index]);
    });

    tabsContainer.appendChild(tab);

    if (index === 0) {
      tab.classList.add('active');
      showPresetContent(preset);
    }
  });
}


function showPresetContent(preset) {
  const tabContent = document.getElementById('tabContent');
  const fileName = document.getElementById('fileSelector').value;
  const saved = modifiedConfigs.get(fileName)?.get(preset.title);
  const config = saved ? saved : preset.config;

  tabContent.innerHTML = `
    <h2>${preset.title}</h2>
    <p><strong>Config Name:</strong> ${preset.configName}</p>
  `;

  const form = document.createElement('form');
  form.className = 'config-form';

  for (const [key, value] of Object.entries(config)) {
    const container = document.createElement('div');
    container.style.marginTop = '10px';

    const label = document.createElement('label');
    label.textContent = key;
    label.style.fontWeight = 'bold';
    label.style.display = 'block';

    container.appendChild(label);

    const input = document.createElement('input');
    input.name = key;
    input.style.width = '100%';

    if (Array.isArray(value)) {
      input.type = 'text';
      input.value = value.join(', ');
      input.title = 'Comma-separated values';
    } else if (!isNaN(value)) {
      input.type = 'number';
      input.value = value;
    } else {
      input.type = 'text';
      input.value = value;
    }

    container.appendChild(input);
    form.appendChild(container);
  }

  tabContent.appendChild(form);
}


async function applyPreset({ shouldReload = true } = {}) {
  // saveCurrentFormData(); // Save the last changes before applying
  if (modifiedConfigs.size === 0) {
    alert('No modified presets to apply.');
    return;
  }
  const allUpdates = [];

  for (const [fileName, presetMap] of modifiedConfigs.entries()) {
    const fileInfo = fileMap[fileName];
    if (!fileInfo || !fileInfo.presets || !fileInfo.filePath) continue;

    for (const [presetTitle, updatedConfig] of presetMap.entries()) {
      const originalPreset = fileInfo.presets.find(p => p.title === presetTitle);
      if (!originalPreset) continue;

      const updatedPreset = {
        ...originalPreset,
        config: updatedConfig,
      };

      // Push update promise
      allUpdates.push(
        window.api.applyPresetToFile(fileInfo.filePath, updatedPreset)
      );
    }
  }

  try {
    await Promise.all(allUpdates);

    // ✅ Clear saved modifications
    modifiedConfigs.clear();

    if (shouldReload) {
      await loadFromResource();
      alert('All presets applied and reloaded successfully.');
    } else {
      alert('All presets applied successfully.');
    }
  } catch (err) {
    alert('Failed to apply one or more presets: ' + err.message);
  }
}



function saveCurrentFormData() {
  const fileName = document.getElementById('fileSelector').value;
  const activeTab = document.querySelector('.tab.active');
  if (!activeTab) return;

  const presetTitle = activeTab.textContent;
  const form = document.querySelector('.config-form');
  if (!form) return;

  const inputs = form.querySelectorAll('input');
  const updatedConfig = {};

  for (const input of inputs) {
    const key = input.name;
    if (!key) continue;

    if (input.type === 'number') {
      updatedConfig[key] = parseInt(input.value, 10);
    } else if (input.type === 'text') {
      const val = input.value;
      updatedConfig[key] = val.includes(',') ? val.split(',').map(v => v.trim()) : val;
    }
  }

  if (!modifiedConfigs.has(fileName)) {
    modifiedConfigs.set(fileName, new Map());
  }

  modifiedConfigs.get(fileName).set(presetTitle, updatedConfig);
}


async function exportAllPresets() {
  const allPresets = {};

  for (const [fileName, fileData] of Object.entries(fileMap)) {
    if (fileData.presets && fileData.presets.length > 0) {
      allPresets[fileName] = {
        filePath: fileData.filePath,
        presets: fileData.presets,
      };
    }
  }

  await window.api.saveJsonToFile(allPresets);
}


async function importAllPresets() {
  const result = await window.api.loadJsonFromFile();
  if (!result) return;

  for (const [fileName, fileData] of Object.entries(result)) {
    if (fileMap[fileName]) {
      fileMap[fileName].presets = fileData.presets;
    } else {
      fileMap[fileName] = fileData;
    }
  }

  // Re-render UI with selected file
  const selectedFile = document.getElementById('fileSelector').value;
  renderFile(selectedFile);
}

document.getElementById('syncToServerBtn').addEventListener('click', async () => {
  const allPresets = {};

  for (const [fileName, fileData] of Object.entries(fileMap)) {
    if (fileData.presets?.length > 0) {
      allPresets[fileName] = {
        filePath: fileData.filePath,
        presets: fileData.presets
      };
    }
  }

  try {
    await window.api.syncPresetsToServer(allPresets);
    alert('Synced to server.');
  } catch (err) {
    alert('Sync failed: ' + err.message);
  }
});

async function syncFromServer() {
  console.log('Syncing from server...');
  try {
    const data = await window.api.syncPresetsFromServer();
    for (const [fileName, fileData] of Object.entries(data)) {
      if (fileMap[fileName]) {
        fileMap[fileName].presets = fileData.presets;
      } else {
        fileMap[fileName] = fileData;
      }
    }

    const selectedFile = document.getElementById('fileSelector').value;
    renderFile(selectedFile);
    alert('Synced from server.');
  } catch (err) {
    alert('Sync failed:' + err.message);
  }
}




async function setResourceFolder() {
  const resourcePath = await window.api.selectResourceFolder();
  if (resourcePath) {
    await loadPresetsFrom(resourcePath);
  }
}

async function loadStoredFolderOnStartup() {
  const resourcePath = await window.api.getStoredResourceFolder();
  if (resourcePath) {
    await loadPresetsFrom(resourcePath);
  }
}

async function loadPresetsFrom(resourcePath) {
  const currentStoredPath = await window.api.getStoredResourceFolder();
  const result = await window.api.loadPresetsFromResource(resourcePath);
  if (!result) return;

  if (result.error) {
    alert(result.error);
    return;
  }

  fileMap = result;
  if (resourcePath !== currentStoredPath) {
    modifiedConfigs.clear();
  }

  const fileSelector = document.getElementById('fileSelector');
  fileSelector.innerHTML = '';

  for (const [fileName, data] of Object.entries(fileMap)) {
    if (data.error) continue;
    const option = document.createElement('option');
    option.value = fileName;
    option.textContent = fileName;
    fileSelector.appendChild(option);
  }

  const firstValid = Object.keys(fileMap).find(name => !fileMap[name].error);
  if (firstValid) {
    fileSelector.value = firstValid;
    renderFile(firstValid);
  } else {
    document.getElementById('tabs').innerHTML = '';
    document.getElementById('tabContent').innerHTML = '<p>No valid presets found.</p>';
  }
}

function showHomePage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Welcome to More-Men Config Editor</h2>
    <button onclick="applyPreset({ shouldReload: false })">✅ Apply</button>
    <button id="syncFromServerBtn" onclick="syncFromServer()">Sync from Server</button>
  `;
}

function showPresetsPage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Settings</h2>
    <div class="tab-container">
      <div style="padding: 10px; background: #ddd;">
        <select id="fileSelector" onchange="handleFileSelect()"></select>
        <button onclick="applyPreset()">✅ Apply</button>
        <button onclick="exportAllPresets()">Export to JSON</button>
        <button onclick="importAllPresets()">Import JSON</button>
        <button id="syncToServerBtn">Sync to Server</button>
        <button id="syncFromServerBtn">Sync from Server</button>
      </div>
      <div class="tabs" id="tabs"></div>
      <div class="tab-content" id="tabContent"></div>
    </div>
  `;
  loadStoredFolderOnStartup();
  renderPresetsUI(content);  
}

function showSettingsPage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Settings</h2>
    <div class="tab-container">
      <div style="padding: 10px; background: #ddd;">
        <button onclick="setResourceFolder()">📁 Set Resource Folder</button>
        <button onclick="applyPreset()">✅ Apply</button>
        <button onclick="exportAllPresets()">Export Changes</button>
        <button onclick="importAllPresets()">Import Changes</button>
        <button id="syncToServerBtn">Sync to Server</button>
        <button id="syncFromServerBtn">Sync from Server</button>
      </div>
    </div>
  `;
}

async function clearStoredFolder() {
  await window.api.clearStoredResourceFolder();
  alert('Stored folder cleared');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  showHomePage();
});