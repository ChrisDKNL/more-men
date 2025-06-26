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
  console.log('Received upload request:');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  if (!req.body || Object.keys(req.body).length === 0) {
    console.error('No data received in request body.');
    return res.status(400).json({ error: 'Empty body' });
  }

  try {
    fs.writeFileSync(PRESET_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error writing file:', err);
    res.status(500).json({ error: 'Failed to write presets' });
  }
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