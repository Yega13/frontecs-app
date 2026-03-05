import EDITOR_JS from '../editor/editor.source.js?raw'
import EDITOR_CSS from '../editor/editor.source.css?raw'

export { EDITOR_JS, EDITOR_CSS }

export const SERVER_JS = `const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Block direct access to server infrastructure files before static middleware sees them
const BLOCKED = new Set(['server.js', 'package.json', 'package-lock.json', 'edits.json']);
app.use((req, res, next) => {
  const first = req.path.replace(/^\/+/, '').split('/')[0];
  if (BLOCKED.has(first)) return res.status(403).end();
  next();
});

app.use(express.static(path.join(__dirname)));

app.post('/api/save', (req, res) => {
  try {
    const stored = JSON.parse(fs.readFileSync(path.join(__dirname, 'edits.json'), 'utf8'));
    if (req.body.secretKey !== stored.secretKey) {
      return res.status(403).json({ ok: false, error: 'Invalid key' });
    }
    fs.writeFileSync(path.join(__dirname, 'edits.json'), JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

app.get('/api/edits', (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'edits.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.json({ edits: [], secretKey: null, seo: {} });
  }
});

app.post('/api/regenerate-key', (req, res) => {
  const newKey = crypto.randomBytes(16).toString('hex');
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'edits.json'), 'utf8');
    const data = JSON.parse(raw);
    data.secretKey = newKey;
    fs.writeFileSync(path.join(__dirname, 'edits.json'), JSON.stringify(data, null, 2));
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '__editor__', 'config.json'), 'utf8'));
    cfg.secretKey = newKey;
    fs.writeFileSync(path.join(__dirname, '__editor__', 'config.json'), JSON.stringify(cfg, null, 2));
  } catch {}
  res.json({ newKey });
});

app.use((req, res) => {
  const filePath = path.resolve(path.join(__dirname, req.path));
  if (!filePath.startsWith(__dirname)) return res.status(403).end();
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Frontecs server running on port ' + PORT));
`

export const PACKAGE_JSON = JSON.stringify({
  name: 'frontecs-site',
  version: '1.0.0',
  main: 'server.js',
  scripts: { start: 'node server.js' },
  dependencies: { express: '^4.18.2' },
}, null, 2)
