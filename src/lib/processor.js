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
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, injection + '\n</body>')
  }
  return html + injection
}

export function detectFramework(files) {
  const checks = [
    { name: 'React', markers: ['data-reactroot', '__next', '__NEXT_DATA__', 'react.production.min.js', 'react-dom.production.min.js', '_next/static'] },
    { name: 'Vue', markers: ['data-v-', 'vue.runtime', '__vue__', 'vue.min.js', 'vue.global.js'] },
    { name: 'Angular', markers: ['ng-version', 'angular.js', 'angular.min.js', 'ng-app', 'platformBrowserDynamic'] },
  ]
  for (const [filePath, { content, binary }] of files.entries()) {
    if (binary) continue
    const text = content || ''
    for (const { name, markers } of checks) {
      if (markers.some(m => text.includes(m) || filePath.includes(m))) {
        return { detected: true, name }
      }
    }
  }
  return { detected: false }
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

  return { framework: detectFramework(files) }
}
