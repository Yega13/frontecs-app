import JSZip from 'jszip'

const BINARY_EXTS = /\.(png|jpg|jpeg|gif|webp|ico|svg|woff|woff2|ttf|eot|otf|pdf)$/i

/**
 * Extracts a ZIP file into a Map<path, { content: string|Uint8Array, binary: boolean }>
 */
export async function extractZip(file) {
  const zip = await JSZip.loadAsync(file)
  const result = new Map()

  // Strip common top-level folder if all files share one
  const allPaths = Object.keys(zip.files).filter(p => !zip.files[p].dir)
  const prefix = getCommonPrefix(allPaths)

  for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue

    const isBinary = BINARY_EXTS.test(zipPath)
    const content = isBinary
      ? await zipEntry.async('uint8array')
      : await zipEntry.async('string')

    const cleanPath = prefix ? zipPath.slice(prefix.length) : zipPath
    result.set(cleanPath, { content, binary: isBinary })
  }

  return result
}

function getCommonPrefix(paths) {
  if (!paths.length) return ''
  const parts = paths[0].split('/')
  let prefix = ''
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(0, i + 1).join('/') + '/'
    if (paths.every(p => p.startsWith(candidate))) {
      prefix = candidate
    } else {
      break
    }
  }
  return prefix
}
