export default function FileTree({ files }) {
  const paths = Array.from(files.keys()).sort()

  const htmlCount = paths.filter(p => p.endsWith('.html')).length
  const totalCount = paths.length

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span>{totalCount} files &middot; {htmlCount} HTML pages will get the editor injected</span>
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

function getIcon(path) {
  if (path.endsWith('.html')) return '📄'
  if (path.endsWith('.css')) return '🎨'
  if (path.endsWith('.js')) return '⚙️'
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(path)) return '🖼️'
  return '📃'
}
