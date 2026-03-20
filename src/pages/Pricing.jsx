export default function Pricing() {
  return (
    <>
      <header className="app-header">
        <div className="header-eyebrow">Simple, transparent pricing</div>
        <h1 className="header-title">
          Free while in <span className="gradient-text">Beta</span>
        </h1>
        <p className="header-sub">
          Full access during the beta. Pricing will be introduced when we launch officially.
        </p>
      </header>

      <div className="pricing-grid">
        <div className="pricing-card pricing-card--featured">
          <div className="pricing-plan-badge">Current plan</div>
          <div className="pricing-name">Beta</div>
          <div className="pricing-price">Free</div>
          <p className="pricing-desc">Everything Frontecs offers, no cost during the beta period.</p>
          <ul className="pricing-features">
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Unlimited ZIP uploads
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Visual editor injection
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Deploy-ready output ZIP
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Supabase content persistence
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              All HTML pages covered
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Undo / redo history
            </li>
          </ul>
        </div>

        <div className="pricing-card pricing-card--soon">
          <div className="pricing-plan-badge pricing-plan-badge--soon">Coming soon</div>
          <div className="pricing-name">Pro</div>
          <div className="pricing-price">TBD</div>
          <p className="pricing-desc">Extended features for teams and agencies handing off sites to clients.</p>
          <ul className="pricing-features pricing-features--muted">
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Everything in Beta
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Team collaboration
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Custom domain support
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Priority support
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              More to come...
            </li>
          </ul>
        </div>
      </div>

      <footer className="app-footer">
        <p>Frontecs &mdash; built for developers who want to ship faster</p>
      </footer>
    </>
  )
}
