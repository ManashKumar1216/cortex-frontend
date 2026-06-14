import { Link, NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../../auth/AuthContext'

const NAV = [
  { to: '/guide', label: 'Guide' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/roadmap', label: 'Roadmap' },
]

export function PublicLayout() {
  const { user } = useAuth()
  return (
    <div className="mkt">
      <header className="mkt-nav">
        <div className="mkt-nav-inner">
          <Link to="/" className="mkt-brand">
            <span className="logo">🧠</span> Cortex
          </Link>
          <nav className="mkt-nav-links">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `mkt-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mkt-nav-actions">
            {user ? (
              <Link to="/today" className="btn primary">
                Open Cortex
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn ghost">
                  Sign in
                </Link>
                <Link to="/login" className="btn primary">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mkt-main">
        <div className="mkt-page">
          <Outlet />
        </div>
      </main>

      <footer className="mkt-footer">
        <div className="mkt-footer-inner">
          <Link to="/" className="mkt-brand">
            <span className="logo">🧠</span> Cortex
          </Link>
          <div className="mkt-footer-links">
            <Link to="/guide">Guide</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/roadmap">Roadmap</Link>
            <Link to="/login">Get started</Link>
          </div>
          <span className="mkt-footer-stamp">Local · Private</span>
          <p className="mkt-footer-note">
            Cortex is in active development. Built to run on one machine — yours. React + Vite ·
            Express + Mongoose · Ollama · MongoDB.
          </p>
        </div>
      </footer>
    </div>
  )
}
