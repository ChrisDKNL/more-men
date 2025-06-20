let fileMap = {};
let currentPresets = [];

async function loadFromResource() {
  const result = await window.api.loadPresetsFromResource();
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
  const config = preset.config;

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

  if (key === 'cp_a' || key === 'cp_b') {
    // Create toggle checkbox
    const toggleLabel = document.createElement('label');
    toggleLabel.style.marginLeft = '10px';
    toggleLabel.style.fontWeight = 'normal';
    toggleLabel.style.fontSize = '0.9em';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = Array.isArray(value);
    toggle.style.marginRight = '6px';

    toggleLabel.appendChild(toggle);
    toggleLabel.appendChild(document.createTextNode('Scaling mode'));
    container.appendChild(toggleLabel);

    // Create inputs for scaling (textarea) and static (number input)
    const scalingInput = document.createElement('textarea');
    scalingInput.style.width = '100%';
    scalingInput.style.display = toggle.checked ? 'block' : 'none';

    // If scaling, join values formatted as time:value (assuming array of strings or objects)
    if (toggle.checked) {
      if (Array.isArray(value)) {
        // Assuming each element is like "time:value" string or an object with time/value keys
        scalingInput.value = value.join(', ');
      } else {
        scalingInput.value = '';
      }
    } else {
      scalingInput.value = '';
    }

    scalingInput.placeholder = 'e.g. 0:100, 60:200, 120:300';

    const staticInput = document.createElement('input');
    staticInput.type = 'number';
    staticInput.style.width = '100%';
    staticInput.style.display = toggle.checked ? 'none' : 'block';
    staticInput.value = !toggle.checked ? value : (Array.isArray(value) ? value[0] : '');

    container.appendChild(scalingInput);
    container.appendChild(staticInput);

    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        scalingInput.style.display = 'block';
        staticInput.style.display = 'none';
        // Convert static to scaling format if needed
        if (staticInput.value) {
          scalingInput.value = `${0}:${staticInput.value}`;  // simple default time=0
        }
      } else {
        scalingInput.style.display = 'none';
        staticInput.style.display = 'block';
        // Convert scaling to static if needed (take first value's value part)
        if (scalingInput.value) {
          // Extract first value after colon
          const firstEntry = scalingInput.value.split(',')[0].trim();
          const parts = firstEntry.split(':');
          staticInput.value = parts.length > 1 ? parts[1] : parts[0];
        }
      }
    });

    } else {
      // For everything else just a single input
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
    }

    form.appendChild(container);
  }

  tabContent.appendChild(form);
}

async function applyPreset() {
  const fileSelector = document.getElementById('fileSelector');
  const fileName = fileSelector.value;

  if (!fileMap[fileName]) {
    alert('No file selected.');
    return;
  }

  const presetIndex = [...document.querySelectorAll('.tab')].findIndex(tab => tab.classList.contains('active'));
  if (presetIndex === -1) {
    alert('No preset selected.');
    return;
  }

  const preset = fileMap[fileName].presets[presetIndex];
  const updatedConfig = {};

  const form = document.querySelector('.config-form');
  const inputs = form.querySelectorAll('input, textarea');

  for (const input of inputs) {
    const label = input.previousElementSibling?.textContent?.trim();

    if (!label) continue;

    if (label === 'cp_a' || label === 'cp_b') {
      const container = input.parentElement;
      const toggle = container.querySelector('input[type=checkbox]');
      const scalingInput = container.querySelector('textarea');
      const staticInput = container.querySelector('input[type=number]:not([name])');

      if (toggle.checked) {
        // Scaling mode
        updatedConfig[label] = scalingInput.value
          .split(',')
          .map(val => parseInt(val.trim(), 10))
          .filter(val => !isNaN(val));
      } else {
        // Static mode
        updatedConfig[label] = parseInt(staticInput.value.trim(), 10);
      }

    } else {
      if (input.type === 'number') {
        updatedConfig[label] = parseInt(input.value, 10);
      } else if (input.type === 'text') {
        updatedConfig[label] = input.value;
      }
    }
  }

  const updatedPreset = {
    ...preset,
    config: updatedConfig,
  };

  try {
    await window.api.applyPresetToFile(fileMap[fileName].filePath, updatedPreset);
    alert('Preset updated successfully.');
  } catch (err) {
    alert('Failed to apply preset: ' + err.message);
  }
}
