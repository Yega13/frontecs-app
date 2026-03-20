import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import Pricing from './pages/Pricing'
import Docs from './pages/Docs'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        {/* Background effects */}
        <div className="bg-orb bg-orb-1" aria-hidden="true" />
        <div className="bg-orb bg-orb-2" aria-hidden="true" />
        <div className="bg-grid" aria-hidden="true" />

        {/* Nav */}
        <nav className="nav">
          <Link to="/" className="nav-logo">
            <svg className="nav-logo-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 8L4 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.5 7l-3 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="nav-logo-name">Frontecs</span>
          </Link>

          <div className="nav-links">
            <NavLink to="/docs" className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link--active' : '')}>
              Docs
            </NavLink>
            <NavLink to="/pricing" className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link--active' : '')}>
              Pricing
            </NavLink>
          </div>

          <span className="nav-badge">Beta</span>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
