function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 9L8 11.5L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function ProcessButton({ onClick, processing, done, onReset }) {
  if (done) {
    return (
      <div className="process-done">
        <div className="process-done-icon">
          <CheckIcon />
        </div>
        <p className="process-done-msg">Your ZIP is downloading</p>
        <p className="process-done-sub">
          Deploy to Railway, Render, Fly.io, or any Node.js host.
        </p>
        <div className="process-done-actions">
          <button className="btn btn--secondary" onClick={onReset}>
            Process another site
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      className="btn btn--primary"
      onClick={onClick}
      disabled={processing}
    >
      {processing ? (
        <>
          <span className="btn-spinner" aria-hidden="true" />
          Processing…
        </>
      ) : (
        <>
          <DownloadIcon />
          Process & Download ZIP
        </>
      )}
    </button>
  )
}
