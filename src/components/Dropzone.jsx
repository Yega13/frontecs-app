import { useState, useRef } from 'react'

function UploadIcon() {
  return (
    <svg className="dropzone-upload-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function Dropzone({ onDrop }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  function validate(file) {
    if (!file) return 'No file selected.'
    if (!file.name.endsWith('.zip')) return 'Please upload a .zip file.'
    return null
  }

  function handle(file) {
    const err = validate(file)
    if (err) { setError(err); return }
    setError('')
    onDrop(file)
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone--dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={e => handle(e.target.files[0])}
      />
      <UploadIcon />
      <p className="dropzone-title">Drop your website ZIP here</p>
      <p className="dropzone-sub">or click to browse &nbsp;·&nbsp; .zip files only</p>
      {error && <p className="dropzone-error">{error}</p>}
    </div>
  )
}
