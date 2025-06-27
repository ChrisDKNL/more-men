let fileMap = {};
let currentPresets = [];
const modifiedConfigs = new Map(); // Maps preset.title to updated config
let isSynced = false;
let syncedData = {};


function showModal(message, defaultValue = '', isInput = false) {
  return new Promise((resolve) => {
    // Create modal elements
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    const box = document.createElement('div');
    box.style.background = '#222';
    box.style.color = '#fff';
    box.style.padding = '30px';
    box.style.borderRadius = '8px';
    box.style.boxShadow = '0 2px 12px #0008';
    box.style.minWidth = '320px';
    box.style.textAlign = 'center';

    const msg = document.createElement('div');
    msg.textContent = message;
    msg.style.marginBottom = '18px';
    box.appendChild(msg);

    let input;
    if (isInput) {
      input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue;
      input.style.width = '90%';
      input.style.marginBottom = '18px';
      box.appendChild(input);
    } else if (defaultValue) {
      // Show the token in a selectable box
      const tokenBox = document.createElement('div');
      tokenBox.textContent = defaultValue;
      tokenBox.style.background = '#333';
      tokenBox.style.padding = '10px';
      tokenBox.style.borderRadius = '4px';
      tokenBox.style.marginBottom = '18px';
      tokenBox.style.userSelect = 'all';
      tokenBox.style.wordBreak = 'break-all';
      box.appendChild(tokenBox);
    }

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.marginRight = '10px';
    okBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(isInput ? input.value : null);
    };

    box.appendChild(okBtn);

    if (isInput) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') okBtn.click();
      });
      setTimeout(() => input.focus(), 100);
    }

    modal.appendChild(box);
    document.body.appendChild(modal);
  });
}


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
    let displayName = fileName
      .replace(/\.inc$/, '') 
      .split('_')                  
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) 
      .join(' ');
    option.textContent = displayName;
    console.log('Adding option:', displayName);

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
  // saveCurrentFormData(); // Save form before switching files
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

  // Filter presets to include only those with 'custom' in the config name
  const customPresets = presets.filter(p => p.configName?.toLowerCase().includes('custom'));

  customPresets.forEach((preset, index) => {
    const tab = document.createElement('div');
    tab.className = 'tab';
    let displayTitle = preset.title
      .split('_')
      .map((word, index) => {
        if (index < 2) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join(' ');
    tab.textContent = displayTitle;
    tab.dataset.index = index;

    tab.addEventListener('click', () => {
      // saveFormData(preset.title, fileName, form);
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showPresetContent(preset);
    });

    tabsContainer.appendChild(tab);

    if (index === 0) {
      tab.classList.add('active');
      showPresetContent(preset);
    }
  });

  // If no custom presets matched, show a message
  if (customPresets.length === 0) {
    tabContent.innerHTML = '<p>No custom game presets found.</p>';
  }
}



function showPresetContent(preset) {
  const tabContent = document.getElementById('tabContent');
  const fileName = document.getElementById('fileSelector').value;
  const saved = modifiedConfigs.get(fileName)?.get(preset.title);
  const config = saved ? saved : preset.config;
  let displayTitle = preset.title
  .split('_')
  .map((word, index) => {
    if (index < 2) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  })
  .join(' ');

  tabContent.innerHTML = `
    <h2>${displayTitle}</h2>
    <p><strong>Config Name:</strong> ${preset.configName}</p>
  `;

  const form = document.createElement('form');
  form.className = 'config-form';

  for (const [key, value] of Object.entries(config)) {
    const container = document.createElement('div');
    container.style.marginTop = '10px';

    const label = document.createElement('label');
    function formatKey(key) {
      const nameMap = {
        start: "Starting MP",
        finish: "Final MP",
        doctrine: "Doctrine Points",
        cp: "Command Points",
      };
      const typeMap = {
        a: "Players",
        b: "AI",
      };

      const parts = key.split('_');

      if (parts.length === 2) {
        const [prefix, suffix] = parts;
        const hasName = prefix in nameMap;
        const hasType = suffix in typeMap;

        if (hasName && hasType) {
          return `${nameMap[prefix]} ${typeMap[suffix]}`;
        } else if (hasName) {
          return nameMap[prefix];
        }
      }

      // Handle keys with no underscores
      if (parts.length === 1 && key in nameMap) {
        return nameMap[key];
      }

      return key; // fallback: return raw key if nothing matched
    }

    label.textContent = formatKey(key);
    // console.log(label.textContent);
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
  const applyBtn = document.createElement('button');
  applyBtn.type = 'button'; // prevent form submit
  applyBtn.textContent = 'Apply Changes';
  applyBtn.style.marginTop = '15px';

  applyBtn.addEventListener('click', () => {
    saveFormData(preset.title, fileName, form);
    alert(`Changes for "${displayTitle}" saved. Click the global Apply button to commit.`);
  });

  form.appendChild(applyBtn);
  tabContent.appendChild(form);
}


async function applyPreset({ shouldReload = true } = {}) {
  const updatesToApply = [];
  const sourceMap = isSynced ? syncedData : fileMap;

  if (!isSynced && modifiedConfigs.size === 0) {
    alert('No modified presets to apply.');
    return;
  }

  console.log('Applying presets:', isSynced ? '[from sync]' : '[local modified configs]');

  if (isSynced) {
    for (const [fileName, fileData] of Object.entries(syncedData)) {
      if (!fileData || !fileData.presets || !fileData.filePath) continue;

      for (const preset of fileData.presets) {
        updatesToApply.push(
          window.api.applyPresetToFile(fileData.filePath, preset)
        );
      }
    }
  } else {
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

        updatesToApply.push(
          window.api.applyPresetToFile(fileInfo.filePath, updatedPreset)
        );
      }
    }
  }

  try {
    await Promise.all(updatesToApply);

    // Clear sync state or modifications
    if (isSynced) {
      isSynced = false;
      syncedData = {};
    } else {
      modifiedConfigs.clear();
    }

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




// function saveCurrentFormData() {
//   console.log('Saving current form data...');
//   const fileName = document.getElementById('fileSelector').value;
//   const activeTab = document.querySelector('.tab.active');
//   if (!activeTab) return;

//   const presetTitle = activeTab.textContent;
//   const form = document.querySelector('.config-form');
//   if (!form) return;

//   const inputs = form.querySelectorAll('input');
//   const updatedConfig = {};

//   for (const input of inputs) {
//     const key = input.name;
//     if (!key) continue;

//     if (input.type === 'number') {
//       updatedConfig[key] = parseInt(input.value, 10);
//     } else if (input.type === 'text') {
//       const val = input.value;
//       updatedConfig[key] = val.includes(',') ? val.split(',').map(v => v.trim()) : val;
//     }
//   }

//   if (!modifiedConfigs.has(fileName)) {
//     modifiedConfigs.set(fileName, new Map());
//   }

//   modifiedConfigs.get(fileName).set(presetTitle, updatedConfig);
//   console.log(`Saved config for ${presetTitle} in ${fileName}:`, updatedConfig);
// }

function saveFormData(presetTitle, fileName, form) {
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
  console.log(`Saved config for ${presetTitle} in ${fileName}:`, updatedConfig);
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


let apiToken = localStorage.getItem('apiToken') || '';

async function ensureApiToken() {
  if (!apiToken) {
    apiToken = await showModal('Enter your API token (from the server):', '', true);
    if (apiToken) {
      localStorage.setItem('apiToken', apiToken);
    }
  }
}

async function setApiToken() {
  const newToken = await showModal('Enter your API token (from the server):', '', true);
  if (newToken) {
    localStorage.setItem('apiToken', newToken);
    apiToken = newToken;
    alert('API token set!');
  }
}

async function syncToServer() {
  await ensureApiToken();
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
    console.log('Syncing presets to server:', allPresets, 'With token:', apiToken );
    const response = await window.api.syncPresetsToServer(allPresets, apiToken);
    alert('Synced to server.');
  } catch (err) {
    alert('Sync failed: ' + err.message);
  }
}

async function syncFromServer() {
  await ensureApiToken();
  try {
    const data = await window.api.syncPresetsFromServer(apiToken);
    for (const [fileName, fileData] of Object.entries(data)) {
      if (fileMap[fileName]) {
        fileMap[fileName].presets = fileData.presets;
      } else {
        fileMap[fileName] = fileData;
      }
    }
    syncedData = data;
    isSynced = true;
    const selectedFile = document.getElementById('fileSelector').value;
    renderFile(selectedFile);
    alert('Synced from server.');
  } catch (err) {
    alert('Sync failed: ' + err.message);
    isSynced = false;
    syncedData = {};
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
    let displayName = fileName
      .replace(/\.inc$/, '')                 
      .split('_')                        
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) 
      .join(' ');                

    option.textContent = displayName;
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

function clearResourcePath() {
  window.api.clearResourcePath()
    .then(() => {
      alert('Resource folder cleared!');
      location.reload(); // Optional: reload app after clearing
    })
    .catch(err => {
      console.error('Failed to clear:', err);
    });
}


function showHomePage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="home-wrapper">
      <h2>Welcome to More-Men Config Editor</h2>
      <div class="home-buttons">
        <button onclick="applyPreset({ shouldReload: false })">✅ Apply</button>
        <button onclick="syncFromServer()">🔄 Sync from Server</button>
      </div>
    </div>
    <div class="tab-container" style="display: none;">
      <div class="toolbar">
        <select id="fileSelector" onchange="handleFileSelect()"></select>
        <button onclick="applyPreset()">✅ Apply</button>
        <button onclick="exportAllPresets()">Export to JSON</button>
        <button onclick="importAllPresets()">Import JSON</button>
        <button onclick="syncToServer()">Sync to Server</button>
        <button onclick="syncFromServer()">🔄 Sync from Server</button>
      </div>
      <div class="tabs" id="tabs"></div>
      <div class="tab-content" id="tabContent"></div>
    </div>
  `;
  // Restore active state from storage
  const darkMode = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark-mode', darkMode);
  loadStoredFolderOnStartup();
  setActiveMenu('homeBtn');
}
function showPresetsPage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="tab-container" style="height: calc(100vh - 130px); display: flex; flex-direction: column;">
      <div class="toolbar">
        <select id="fileSelector" onchange="handleFileSelect()"></select>
        <button onclick="applyPreset()">✅ Apply</button>
        <button onclick="exportAllPresets()">Export to JSON</button>
        <button onclick="importAllPresets()">Import JSON</button>
        <button onclick="syncToServer()">Sync to Server</button>
        <button onclick="syncFromServer()">🔄 Sync from Server</button>
      </div>
      <div class="tabs" id="tabs"></div>
      <div class="tab-content" id="tabContent"></div>
    </div>
  `;
  loadStoredFolderOnStartup();
  // renderPresetsUI(content);
  setActiveMenu('presetsBtn');
}

function showSettingsPage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="toolbar">
      <button onclick="setResourceFolder()">📁 Set Resource Folder</button>
      <button onclick="clearResourcePath()">🧹 Clear Resource Folder</button>
      <button onclick="setApiToken()">🔑 Set API Token</button>
      <label for="darkModeToggle">🌙 Dark Mode</label>
      <input type="checkbox" id="darkModeToggle">
    </div>
  `;
  // Restore active state from storage
  const darkMode = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark-mode', darkMode);

  // Set toggle checkbox to reflect current mode
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) {
    toggle.checked = darkMode;

    toggle.addEventListener('change', () => {
      document.body.classList.toggle('dark-mode', toggle.checked);
      localStorage.setItem('darkMode', toggle.checked);
    });
  }
  setActiveMenu('settingsBtn');
}

function setActiveMenu(buttonId) {
  document.querySelectorAll('#menu button').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(buttonId);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}


async function clearStoredFolder() {
  await window.api.clearStoredResourceFolder();
  alert('Stored folder cleared');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  showHomePage();
});