import EDITOR_JS from '../editor/editor.source.js?raw'
import EDITOR_CSS from '../editor/editor.source.css?raw'

export { EDITOR_JS, EDITOR_CSS }

// ================================================================
// SUPABASE CREDENTIALS — paste your project values here
// Get them from: supabase.com → your project → Settings → API
// ================================================================
const SUPABASE_URL = 'https://ptamgrfdirothcxybzow.supabase.co'
const SUPABASE_KEY = 'sb_publishable_5eYvTIxYiWNdwJO6JkPxsQ_q4OiM6D_'

export const SERVER_JS = `const express = require('express');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('${SUPABASE_URL}', '${SUPABASE_KEY}');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Block direct access to server infrastructure files
const BLOCKED = new Set(['server.js', 'package.json', 'package-lock.json', 'edits.json']);
app.use((req, res, next) => {
  const first = req.path.split('/').filter(Boolean)[0] || '';
  if (BLOCKED.has(first)) return res.status(403).end();
  next();
});

function getConfig() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'edits.json'), 'utf8'));
}

app.get('/api/edits', async (req, res) => {
  try {
    const config = getConfig();
    const { data, error } = await supabase
      .from('site_edits')
      .select('edits, seo')
      .eq('site_id', config.siteId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({
      edits:     data ? data.edits : [],
      seo:       data ? data.seo   : {},
      secretKey: config.secretKey,
    });
  } catch (e) {
    res.json({ edits: [], seo: {} });
  }
});

app.post('/api/save', async (req, res) => {
  try {
    const config = getConfig();
    if (req.body.secretKey !== config.secretKey) {
      return res.status(403).json({ ok: false, error: 'Invalid key' });
    }
    const { error } = await supabase
      .from('site_edits')
      .upsert({
        site_id: config.siteId,
        edits:   req.body.edits || [],
        seo:     req.body.seo   || {},
      });
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Serve HTML files with edits pre-injected — eliminates flash of original content.
// The preloaded data is read synchronously by the editor script (window.__FE_EDITS__).
app.use(async (req, res, next) => {
  const rawPath = path.resolve(path.join(__dirname, req.path));
  if (!rawPath.startsWith(__dirname)) return res.status(403).end();

  const ext = path.extname(req.path).toLowerCase();
  const isHtml = (ext === '.html' || ext === '' || req.path === '/');
  if (!isHtml) return next();

  let filePath = rawPath;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(__dirname, 'index.html');
  }
  if (!filePath.endsWith('.html')) {
    filePath = path.join(__dirname, 'index.html');
  }

  try {
    const config = getConfig();
    const { data } = await supabase
      .from('site_edits')
      .select('edits, seo')
      .eq('site_id', config.siteId)
      .single();

    let html = fs.readFileSync(filePath, 'utf8');
    const preload = '<script>window.__FE_EDITS__=' + JSON.stringify({
      edits: data ? data.edits : [],
      seo:   data ? data.seo   : {},
    }) + ';</script>';

    // Inject just before </head> so it's available before any other script runs
    const headClose = html.toLowerCase().lastIndexOf('</head>');
    if (headClose !== -1) {
      html = html.slice(0, headClose) + preload + html.slice(headClose);
    } else {
      html = preload + html;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.sendFile(filePath);
  }
});

app.use(express.static(path.join(__dirname)));

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
  dependencies: {
    express: '^4.18.2',
    '@supabase/supabase-js': '^2.45.0',
  },
}, null, 2)
