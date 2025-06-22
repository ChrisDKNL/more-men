const fs = require('fs');

function updatePresetInFile(filePath, presetObject) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');

  const { title, configName, config } = presetObject;
  const customPrefix = `{"c:${title}"`;
  const nonCustomPattern = new RegExp(`\\{"[^c]:${title}"`);

  let updatedLines = [...lines];
  let foundTitleIndex = -1;
  let foundNonCustom = false;

  // Step 1: Look specifically for {"c:<title>"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(customPrefix)) {
      foundTitleIndex = i;
      break;
    }

    if (nonCustomPattern.test(line)) {
      foundNonCustom = true;
    }
  }

  if (foundTitleIndex === -1) {
    if (foundNonCustom) {
      console.log(`Skipped non-custom "${title}"`);
    } else {
      console.log(`Skipped not found "${title}"`);
    }
    return;
  }

  // Step 2: Go 5 lines down from the title line
  const configLineIndex = foundTitleIndex + 5;
  const originalConfigLine = lines[configLineIndex] || '';

  if (!originalConfigLine.includes(`("${configName}"`)) {
    console.log(`Skipped "${title}" — configName mismatch at line ${configLineIndex}`);
    return;
  }

  // Step 3: Build the new config line
  const configTokens = Object.entries(config).map(([key, val]) => {
    const safeValue = (v) => String(v).replace(/\)+$/, ''); // remove trailing ')'
    
    if (Array.isArray(val)) {
      return `${key}(${val.map(safeValue).join(',')})`;
    } else {
      return `${key}(${safeValue(val)})`;
    }
  });

  const newConfigLine = `\t\t("${configName}"\t\t\t${configTokens.join(' ')})`;

  // Step 4: Replace the config line
  updatedLines[configLineIndex] = newConfigLine;

  // Step 5: Write the updated file back
  fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf8');
  console.log(`Updated "${title}"`);
}

module.exports = { updatePresetInFile };
