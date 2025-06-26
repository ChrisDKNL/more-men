const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const PRESET_FILE = path.join(__dirname, 'presets.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Upload presets from Electron app
app.post('/upload-presets', (req, res) => {
  fs.writeFileSync(PRESET_FILE, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// Download presets to Electron app
app.get('/download-presets', (req, res) => {
  if (fs.existsSync(PRESET_FILE)) {
    res.sendFile(PRESET_FILE);
  } else {
    res.status(404).json({ error: 'Preset file not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Preset server running at http://localhost:${PORT}`);
});