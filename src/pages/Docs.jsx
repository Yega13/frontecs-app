const FAQ = [
  {
    q: 'Does Frontecs work with React or Vue sites?',
    a: 'Frontecs works best with plain static HTML. If your site was built with a framework, export it as a static build first (e.g. vite build, next export) and use that output ZIP.',
  },
  {
    q: 'Where is my content saved?',
    a: 'Edits are saved to Supabase if you have connected a project. Without Supabase, changes are stored in the browser session and won\'t persist across page reloads.',
  },
  {
    q: 'What is the secret key and where do I set it?',
    a: 'The secret key protects your edit mode so only you or your clients can access it. It is configured in the server environment variables of your deployed output.',
  },
  {
    q: 'Can I give my client access to edit the site?',
    a: 'Yes — share the edit URL (with the ?edit= key) with your client. They can click any text, image, or section and edit it directly in the browser.',
  },
  {
    q: 'What can be edited?',
    a: 'Text, images, links, section order, and SEO metadata. Undo/redo is supported. Changes sync across all matching elements on every page.',
  },
  {
    q: 'Is Frontecs free?',
    a: 'Yes, Frontecs is completely free during the beta. Check the Pricing page for future plans.',
  },
]

export default function Docs() {
  return (
    <>
      <header className="app-header">
        <div className="header-eyebrow">Documentation</div>
        <h1 className="header-title">
          Getting <span className="gradient-text">started</span>
        </h1>
        <p className="header-sub">
          Make your static site editable in minutes — no framework changes, no rebuild.
        </p>
      </header>

      <div className="docs-wrap">
        <div className="docs-content">

          <section className="docs-section">
            <h2 className="docs-section-title">Requirements</h2>
            <ul className="docs-list">
              <li>A static HTML/CSS/JS website exported as a ZIP file</li>
              <li>Node.js installed on your deploy server</li>
              <li>(Optional) A Supabase project for persistent content storage</li>
            </ul>
          </section>

          <section className="docs-section">
            <div className="docs-step-num">Step 1</div>
            <h2 className="docs-section-title">Prepare your ZIP</h2>
            <p className="docs-p">
              Export or download your static website as a ZIP file. It should contain your HTML pages, CSS, JS, and any assets (images, fonts, etc.).
            </p>
            <div className="docs-note">
              Your site must be plain HTML — not a live Next.js or React app. If you use a framework, run a static export first and ZIP that output.
            </div>
          </section>

          <section className="docs-section">
            <div className="docs-step-num">Step 2</div>
            <h2 className="docs-section-title">Upload & process</h2>
            <p className="docs-p">
              Drop your ZIP into Frontecs. It scans every HTML file, injects a lightweight visual editor script into each one, and packages everything with a small Express server.
            </p>
          </section>

          <section className="docs-section">
            <div className="docs-step-num">Step 3</div>
            <h2 className="docs-section-title">Deploy</h2>
            <p className="docs-p">Download the output ZIP and deploy it to any Node.js-compatible host:</p>
            <ul className="docs-list">
              <li><strong>Railway</strong> — connect your repo and deploy in one click</li>
              <li><strong>Render</strong> — free tier available, great for Node apps</li>
              <li><strong>Fly.io</strong> — fast global deployment</li>
              <li>Any VPS with Node.js installed</li>
            </ul>
          </section>

          <section className="docs-section">
            <div className="docs-step-num">Step 4</div>
            <h2 className="docs-section-title">Access edit mode</h2>
            <p className="docs-p">
              Visit your deployed site and add <code className="docs-inline-code">?edit=YOUR_SECRET_KEY</code> to the URL to enable the visual editor.
            </p>
            <div className="docs-code">https://yoursite.com?edit=your-secret-key</div>
          </section>

          <section className="docs-faq">
            <h2 className="docs-faq-title">FAQ</h2>
            <div className="faq-list">
              {FAQ.map(({ q, a }) => (
                <div className="faq-item" key={q}>
                  <h3 className="faq-q">{q}</h3>
                  <p className="faq-a">{a}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      <footer className="app-footer">
        <p>Frontecs &mdash; built for developers who want to ship faster</p>
      </footer>
    </>
  )
}
