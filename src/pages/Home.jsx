import { useState, useCallback } from 'react'
import Dropzone from '../components/Dropzone'
import FileTree from '../components/FileTree'
import ProcessButton from '../components/ProcessButton'
import { extractZip } from '../lib/extractor'

export default function Home() {
  const [files, setFiles] = useState(null)
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
    const { processAndDownload } = await import('../lib/processor')
    const result = await processAndDownload(files, sourceName)
    if (result?.framework?.detected) setFramework(result.framework)
    setProcessing(false)
    setDone(true)
  }, [files, sourceName])

  return (
    <>
      {/* Hero */}
      <header className="app-header">
        <div className="header-eyebrow">Static site tooling for developers</div>
        <h1 className="header-title">
          Turn any website into<br />an <span className="gradient-text">editable one</span>
        </h1>
        <p className="header-sub">
          Drop a static ZIP, inject a visual editor into every HTML page,
          and deploy anywhere — no rebuild required.
        </p>
      </header>

      {/* Tool */}
      <main className="app-main">
        {!files ? (
          <Dropzone onDrop={handleDrop} />
        ) : (
          <div className="ready-view">
            {framework?.detected && (
              <div className="framework-warning">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1.5L14.9 14H1.1L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M8 6.5v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="8" cy="11.5" r="0.7" fill="currentColor" />
                </svg>
                This site appears to use {framework.name}. The editor works best with plain static HTML. Editing may be unstable.
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

      {/* How it works */}
      <section className="steps" aria-label="How it works">
        <div className="step">
          <div className="step-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="step-num">01</div>
          <h3 className="step-title">Upload</h3>
          <p className="step-desc">Drop your exported static website ZIP. Any HTML/CSS/JS project works.</p>
        </div>

        <div className="step-connector" aria-hidden="true">
          <svg viewBox="0 0 48 2" fill="none">
            <line x1="0" y1="1" x2="48" y2="1" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
          </svg>
        </div>

        <div className="step">
          <div className="step-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="step-num">02</div>
          <h3 className="step-title">Process</h3>
          <p className="step-desc">Frontecs injects a lightweight inline visual editor into every HTML page.</p>
        </div>

        <div className="step-connector" aria-hidden="true">
          <svg viewBox="0 0 48 2" fill="none">
            <line x1="0" y1="1" x2="48" y2="1" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
          </svg>
        </div>

        <div className="step">
          <div className="step-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="step-num">03</div>
          <h3 className="step-title">Deploy</h3>
          <p className="step-desc">Download the ready-to-deploy ZIP and host on Railway, Render, Fly.io, or any Node host.</p>
        </div>
      </section>

      {/* Before / After */}
      <section className="before-after" aria-label="Before and after">
        <div className="section-label">See it in action</div>
        <h2 className="section-title">From static to <span className="gradient-text">editable</span></h2>
        <p className="section-sub">Upload your ZIP and get a fully editable version of your site in seconds.</p>
        <div className="ba-grid">
          <div className="ba-card">
            <div className="ba-tag ba-tag--before">Before</div>
            <div className="ba-img-wrap ba-img-wrap--placeholder">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Screenshot coming soon</span>
            </div>
            <p className="ba-desc">A plain static HTML site — no way for clients to edit content.</p>
          </div>

          <div className="ba-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="ba-card">
            <div className="ba-tag ba-tag--after">After</div>
            <div className="ba-img-wrap ba-img-wrap--placeholder">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Screenshot coming soon</span>
            </div>
            <p className="ba-desc">The same site with Frontecs — visual editing toolbar, live changes, no code needed.</p>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <p>Frontecs &mdash; built for developers who want to ship faster</p>
      </footer>
    </>
  )
}
