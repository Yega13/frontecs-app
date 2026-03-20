function HtmlFileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="13" height="13" rx="2.5" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.4)" strokeWidth="0.7" />
      <path d="M4.5 4.5L2.5 7L4.5 9.5" stroke="#818cf8" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 4.5L11.5 7L9.5 9.5" stroke="#818cf8" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CssFileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="13" height="13" rx="2.5" fill="rgba(168,85,247,0.1)" stroke="rgba(168,85,247,0.38)" strokeWidth="0.7" />
      <path d="M5 4.5C4.2 4.5 3.5 5.2 3.5 6v.5c0 .6-.5 1-.5 1s.5.4.5 1V9c0 .8.7 1.5 1.5 1.5" stroke="#c084fc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 4.5C9.8 4.5 10.5 5.2 10.5 6v.5c0 .6.5 1 .5 1s-.5.4-.5 1V9c0 .8-.7 1.5-1.5 1.5" stroke="#c084fc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function JsFileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="13" height="13" rx="2.5" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.38)" strokeWidth="0.7" />
      <path d="M4.5 5v5.5" stroke="#fbbf24" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M9.5 5v3.5c0 1.1-1 2-2 2" stroke="#fbbf24" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

function ImageFileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="13" height="13" rx="2.5" fill="rgba(52,211,153,0.08)" stroke="rgba(52,211,153,0.33)" strokeWidth="0.7" />
      <path d="M1.5 9.5L4.5 6.5L7 9L9 7L12.5 10.5" stroke="#34d399" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="4.5" r="1" fill="#34d399" opacity="0.75" />
    </svg>
  )
}

function GenericFileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="13" height="13" rx="2.5" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.7" />
      <path d="M4 5h6M4 7.5h6M4 10h4" stroke="rgba(255,255,255,0.28)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function getIcon(path) {
  if (path.endsWith('.html')) return <HtmlFileIcon />
  if (path.endsWith('.css')) return <CssFileIcon />
  if (path.endsWith('.js')) return <JsFileIcon />
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(path)) return <ImageFileIcon />
  return <GenericFileIcon />
}

export default function FileTree({ files }) {
  const paths = Array.from(files.keys()).sort()
  const htmlCount = paths.filter(p => p.endsWith('.html')).length
  const totalCount = paths.length

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <svg className="file-tree-header-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M1 3h10M1 6h10M1 9h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {totalCount} files &middot; {htmlCount} HTML page{htmlCount !== 1 ? 's' : ''} will get the editor injected
      </div>
      <ul className="file-tree-list">
        {paths.map(p => (
          <li key={p} className={`file-tree-item ${p.endsWith('.html') ? 'file-tree-item--html' : ''}`}>
            <span className="file-tree-icon">{getIcon(p)}</span>
            <span className="file-tree-path">{p}</span>
            {p.endsWith('.html') && <span className="file-tree-badge">editor</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
