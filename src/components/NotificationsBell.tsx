import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useNotices, useUnreadCount } from '../api/pulse'
import { DropdownMenu } from './ui'

const SEV_KIND: Record<string, string> = { info: 'info', warn: 'warn', critical: 'bad' }

/** Topbar notifications: unread count + a panel of recent Pulse nudges. */
export function NotificationsBell() {
  const unread = useUnreadCount()
  const notices = useNotices()
  const count = unread.data?.count ?? 0
  const recent = (notices.data ?? []).slice(0, 6)

  return (
    <DropdownMenu
      align="right"
      panelClassName="notif-panel"
      trigger={
        <span className="notif-bell" aria-label={`Notifications${count ? `, ${count} unread` : ''}`}>
          <Bell size={16} />
          {count > 0 && <span className="notif-dot mono">{count > 9 ? '9+' : count}</span>}
        </span>
      }
    >
      <div className="notif-head">
        <span className="eyebrow">Pulse</span>
        <Link to="/pulse" className="notif-all">
          Open Pulse
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="notif-empty muted small">All quiet — no nudges right now.</p>
      ) : (
        <ul className="notif-list">
          {recent.map((n) => (
            <li key={n.id} className={`notif-item${n.status === 'unread' ? ' unread' : ''}`}>
              <span className={`notif-sev ${SEV_KIND[n.severity] ?? 'info'}`} aria-hidden="true" />
              <Link to="/pulse" className="notif-link">
                <span className="notif-title">{n.title}</span>
                <span className="notif-body muted small">{n.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DropdownMenu>
  )
}
