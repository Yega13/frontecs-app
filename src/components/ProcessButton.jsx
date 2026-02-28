export default function ProcessButton({ onClick, processing, done, onReset }) {
  if (done) {
    return (
      <div className="process-done">
        <p className="process-done-msg">✅ Done! Your ZIP is downloading.</p>
        <p className="process-done-sub">Deploy it to Railway, Render, Fly.io, or any Node.js host.</p>
        <button className="btn btn--secondary" onClick={onReset}>
          Process another site
        </button>
      </div>
    )
  }

  return (
    <button
      className="btn btn--primary"
      onClick={onClick}
      disabled={processing}
    >
      {processing ? 'Processing…' : 'Process & Download ZIP'}
    </button>
  )
}
