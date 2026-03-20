const CHECK = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CROSS = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

export default function Pricing() {
  return (
    <>
      <header className="app-header">
        <div className="header-eyebrow">Simple, transparent pricing</div>
        <h1 className="header-title">
          The right plan for <span className="gradient-text">your needs</span>
        </h1>
        <p className="header-sub">
          Start free and upgrade when you need more.
        </p>
      </header>

      <div className="pricing-grid">

        {/* Free */}
        <div className="pricing-card">
          <div className="pricing-plan-badge pricing-plan-badge--free">Free</div>
          <div className="pricing-name">Starter</div>
          <div className="pricing-price">$0<span className="pricing-period">/mo</span></div>
          <p className="pricing-desc">Get started with Frontecs at no cost. Limited to personal and trial use.</p>
          <ul className="pricing-features">
            <li className="pricing-feature--yes">
              {CHECK}
              5 sites per month
            </li>
            <li className="pricing-feature--yes">
              {CHECK}
              Visual editor injection
            </li>
            <li className="pricing-feature--yes">
              {CHECK}
              Deploy-ready output ZIP
            </li>
            <li className="pricing-feature--yes">
              {CHECK}
              All HTML pages covered
            </li>
            <li className="pricing-feature--no">
              {CROSS}
              Undo / redo history
            </li>
            <li className="pricing-feature--no">
              {CROSS}
              Supabase persistence
            </li>
            <li className="pricing-feature--no">
              {CROSS}
              Priority support
            </li>
          </ul>
        </div>

        {/* Pro */}
        <div className="pricing-card pricing-card--featured">
          <div className="pricing-plan-badge">Pro</div>
          <div className="pricing-name">Pro</div>
          <div className="pricing-price">$20<span className="pricing-period">/mo</span></div>
          <p className="pricing-desc">Everything unlocked. Built for freelancers and agencies handing off sites to clients.</p>
          <ul className="pricing-features">
            <li className="pricing-feature--yes">
              {CHECK}
              Unlimited sites per month
            </li>
            <li className="pricing-feature--yes">
              {CHECK}
              Visual editor injection
            </li>
            <li className="pricing-feature--yes">
              {CHECK}
              Deploy-ready output ZIP
            </li>
            <li className="pricing-feature--yes">
              {CHECK}
              All HTML pages covered
            </li>
            <li className="pricing-feature--yes">
              {CHECK}
              Undo / redo history
            </li>
            <li className="pricing-feature--yes">
              {CHECK}
              Supabase persistence
            </li>
            <li className="pricing-feature--yes">
              {CHECK}
              Priority support
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
