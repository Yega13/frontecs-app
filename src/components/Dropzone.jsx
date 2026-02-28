import { useState, useRef } from 'react'

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

  function onDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function onDropEvent(e) {
    e.preventDefault()
    setDragging(false)
    handle(e.dataTransfer.files[0])
  }

  function onFileInput(e) {
    handle(e.target.files[0])
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone--dragging' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDropEvent}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={onFileInput}
      />
      <div className="dropzone-icon">📁</div>
      <p className="dropzone-title">Drop your website ZIP here</p>
      <p className="dropzone-sub">or click to browse</p>
      {error && <p className="dropzone-error">{error}</p>}
    </div>
  )
}
