import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { SERVER_JS, PACKAGE_JSON, EDITOR_JS, EDITOR_CSS } from './templates'

function generateKey() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateSiteId() {
  return 'site_' + Math.random().toString(36).slice(2, 8)
}

function injectEditorIntoHtml(html) {
  const injection = `\n  <link rel="stylesheet" href="/__editor__/editor.css">\n  <script src="/__editor__/editor.js"></script>`
  if (html.includes('</body>')) {
    return html.replace('</body>', injection + '\n</body>')
  }
  return html + injection
}

export async function processAndDownload(files, originalName) {
  const secretKey = generateKey()
  const siteId = generateSiteId()

  const zip = new JSZip()

  // Add all original files, injecting editor into HTML files
  for (const [path, { content, binary }] of files.entries()) {
    if (!binary && path.endsWith('.html')) {
      zip.file(path, injectEditorIntoHtml(content))
    } else {
      zip.file(path, content)
    }
  }

  // Add __editor__ assets
  zip.file('__editor__/editor.js', EDITOR_JS)
  zip.file('__editor__/editor.css', EDITOR_CSS)
  zip.file('__editor__/config.json', JSON.stringify({ secretKey, siteId }, null, 2))

  // Add server files
  zip.file('server.js', SERVER_JS)
  zip.file('package.json', PACKAGE_JSON)

  // Add empty edits.json
  zip.file('edits.json', JSON.stringify({ secretKey, siteId, edits: [], seo: {} }, null, 2))

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const outName = originalName.replace(/\.zip$/i, '') + '-frontecs.zip'
  saveAs(blob, outName)
}
