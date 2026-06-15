import { NavLink, useLocation } from 'react-router-dom'

import { hubForPath } from '../lib/nav'

/**
 * The within-section navigation: when the current route belongs to a hub
 * (Plan / Reflect / Channels), render its sibling surfaces as sub-tabs.
 * Returns null on standalone pages (Today / Chat / Capture / Pulse).
 */
export function SubNav() {
  const location = useLocation()
  const hub = hubForPath(location.pathname)
  if (!hub) return null
  return (
    <nav className="subnav" aria-label={`${hub.label} sections`}>
      {hub.items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `subnav-tab${isActive ? ' active' : ''}`}
        >
          <item.icon size={15} strokeWidth={2} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
