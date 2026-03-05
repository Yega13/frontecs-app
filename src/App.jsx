import { useState, useCallback } from 'react'
import Dropzone from './components/Dropzone'
import FileTree from './components/FileTree'
import ProcessButton from './components/ProcessButton'
import { extractZip } from './lib/extractor'
import './App.css'

export default function App() {
  const [files, setFiles] = useState(null) // Map<path, { content, binary }>
  const [sourceName, setSourceName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [framework, setFramework] = useState(null)

  const handleDrop = useCallback(async (droppedFile) => {
    setDone(false)
    setProcessing(false)
    setSourceName(droppedFile.name)
    const extracted = await extractZip(droppedFile)
    setFiles(extracted)
  }, [])

  const handleProcess = useCallback(async () => {
    if (!files) return
    setProcessing(true)

    const { processAndDownload } = await import('./lib/processor')
    const result = await processAndDownload(files, sourceName)
    if (result?.framework?.detected) setFramework(result.framework)

    setProcessing(false)
    setDone(true)
  }, [files, sourceName])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Frontecs</h1>
        <p>Upload a static website ZIP → Get an editable version → Deploy anywhere</p>
      </header>

      <main className="app-main">
        {!files ? (
          <Dropzone onDrop={handleDrop} />
        ) : (
          <div className="ready-view">
            {framework?.detected && (
              <div className="framework-warning">
                ⚠ This site appears to use {framework.name}. The editor works best with plain static HTML. Editing may be unstable.
              </div>
            )}
            <FileTree files={files} />
            <ProcessButton
              onClick={handleProcess}
              processing={processing}
              done={done}
              onReset={() => { setFiles(null); setSourceName(''); setDone(false); setFramework(null) }}
            />
          </div>
        )}
      </main>
    </div>
  )
}
