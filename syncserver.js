const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const PRESET_FILE = path.join(__dirname, 'presets.json');
const API_TOKEN_FILE = path.join(__dirname, 'api-token.txt');

// Generate or load API token
let apiToken;
if (fs.existsSync(API_TOKEN_FILE)) {
  apiToken = fs.readFileSync(API_TOKEN_FILE, 'utf8').trim();
} else {
  apiToken = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(API_TOKEN_FILE, apiToken);
  console.log('Generated new API token:', apiToken);
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Middleware to check API token
function checkApiToken(req, res, next) {
  const clientToken = req.headers['x-api-token'];
  console.log('Received API token:', clientToken);
  if (clientToken !== apiToken) {
    return res.status(401).json({ error: 'Invalid API token' });
  }
  next();
}

// Upload presets from Electron app
app.post('/upload-presets', checkApiToken, (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Empty body' });
  }
  try {
    fs.writeFileSync(PRESET_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
    console.log('Presets uploaded successfully.');
  } catch (err) {
    console.error('Error writing file:', err);
    res.status(500).json({ error: 'Failed to write presets' });
  }
});

// Download presets to Electron app
app.get('/download-presets', checkApiToken, (req, res) => {
  if (fs.existsSync(PRESET_FILE)) {
    res.sendFile(PRESET_FILE);
  } else {
    res.status(404).json({ error: 'Preset file not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Preset server running at http://localhost:${PORT}`);
  console.log(`API token: ${apiToken}`);
});