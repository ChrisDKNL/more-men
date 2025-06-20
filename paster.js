const fs = require('fs');

function updatePresetInFile(filePath, presetObject) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');

  const { title, configName, config } = presetObject;
  const targetTitleLine = `{"s:${title}"`;
  let updatedLines = [...lines];
  let foundTitleIndex = -1;

  // Step 1: Find the line with the matching title
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(targetTitleLine)) {
      foundTitleIndex = i;
      break;
    }
  }

  if (foundTitleIndex === -1) {
    throw new Error(`Could not find preset with title "${title}" in file.`);
  }

  // Step 2: Go 5 lines down from the title line
  const configLineIndex = foundTitleIndex + 5;
  const originalConfigLine = lines[configLineIndex] || '';

  if (!originalConfigLine.includes(`("${configName}"`)) {
    throw new Error(`Config line at index ${configLineIndex} does not match configName "${configName}".`);
  }

  // Step 3: Construct the new config line
  const configTokens = Object.entries(config).map(([key, val]) => {
    if (Array.isArray(val)) {
      return `${key}(${val.join(',')})`;
    } else {
      return `${key}(${val})`;
    }
  });

  const newConfigLine = `\t\t("${configName}"\t\t\t${configTokens.join(' ')})`;

  // Step 4: Replace the line in the copy of file content
  updatedLines[configLineIndex] = newConfigLine;

  // Step 5: Write back to file
  fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf8');
  console.log(`Successfully updated config for "${title}" in file.`);
}

module.exports = { updatePresetInFile };