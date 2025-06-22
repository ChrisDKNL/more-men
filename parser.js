const fs = require('fs');

function parsePresetsFromFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const presetsStart = fileContent.indexOf('{presets');
  if (presetsStart === -1) {
    throw new Error("Couldn't find '{presets' in the file.");
  }

  let braceCount = 0;
  let i = presetsStart;
  let inBlock = false;

  while (i < fileContent.length) {
    const char = fileContent[i];
    if (char === '{') {
      braceCount++;
      inBlock = true;
    } else if (char === '}') {
      braceCount--;
    }
    i++;
    if (inBlock && braceCount === 0) break;
  }

  const presetsBlock = fileContent.slice(presetsStart, i);
  const lines = presetsBlock.split('\n');
  const presets = [];

  let currentPresetLines = [];
  let collecting = false;
  let presetBraceCount = 0;

  for (let line of lines) {
    line = line.trim();

    if (line.startsWith('{"')) {
      if (currentPresetLines.length > 0 && presetBraceCount === 0) {
        presets.push(currentPresetLines);
        currentPresetLines = [];
      }
      currentPresetLines.push(line);
      collecting = true;
      presetBraceCount = 1;
    } else if (collecting) {
      currentPresetLines.push(line);
      for (const ch of line) {
        if (ch === '{') presetBraceCount++;
        else if (ch === '}') presetBraceCount--;
      }
      if (presetBraceCount === 0) {
        presets.push(currentPresetLines);
        currentPresetLines = [];
        collecting = false;
      }
    }
  }

  const presetObjects = presets.map(parsePreset);

  // presetObjects.forEach((preset, i) => {
  //   console.log(`Preset ${i + 1}:`, JSON.stringify(preset, null, 2));
  // });

  return presetObjects;
}

function parsePreset(presetLines) {
  const rawTitle = presetLines[0] ? presetLines[0].trim() : null;
  const title = cleanTitle(rawTitle);

  const sixthLine = presetLines[5] ? presetLines[5].trim() : '';
  const tokens = sixthLine ? sixthLine.split(/\s+/) : [];

  function parseValue(valueStr) {
    if (!valueStr) return null;
    if (valueStr.includes(',')) return valueStr.split(',').map(v => v.trim());
    const num = Number(valueStr);
    return isNaN(num) ? valueStr : num;
  }

  const config = {};
  let configName = null;

  tokens.forEach((token, index) => {
    if (index === 0 && token.startsWith('("')) {
      configName = token.slice(2).replace(/"$/, '');
      return;
    }

    const openParenIndex = token.indexOf('(');
    const closeParenIndex = token.lastIndexOf(')');

    if (openParenIndex > 0 && closeParenIndex > openParenIndex) {
      const key = token.slice(0, openParenIndex);
      const valueStr = token.slice(openParenIndex + 1, closeParenIndex);
      config[key] = parseValue(valueStr);
    }
  });

  return {
    title,
    configName,
    config
  };
}

function cleanTitle(rawTitle) {
  const match = rawTitle.match(/^\{"[sc]:(.*?)"/);
  return match ? match[1] : rawTitle;
}

module.exports = { parsePresetsFromFile };