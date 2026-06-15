import { ChevronRight, LogOut, Search } from 'lucide-react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { useNewsSummary } from './api/news'
import { useDueReminders } from './api/reminders'
import { useAuth } from './auth/AuthContext'
import { CommandPalette } from './components/CommandPalette'
import { NotificationsBell } from './components/NotificationsBell'
import { PublicLayout } from './components/public/PublicLayout'
import { BrandMark, ConfirmProvider, DropdownMenu, ToastProvider } from './components/ui'
import { HUBS, PRIMARY, hubForPath, navItemForPath } from './lib/nav'
import { AuthPage } from './pages/AuthPage'
import { AreaDetailPage } from './pages/AreaDetailPage'
import { AreasPage } from './pages/AreasPage'
import { AmbientPage } from './pages/AmbientPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { BrainGraphPage } from './pages/BrainGraphPage'
import { CapturePage } from './pages/CapturePage'
import { ChatPage } from './pages/ChatPage'
import { EmailPage } from './pages/EmailPage'
import { GoalsPage } from './pages/GoalsPage'
import { HabitsPage } from './pages/HabitsPage'
import { JournalPage } from './pages/JournalPage'
import { MemoryPage } from './pages/MemoryPage'
import { NewsPage } from './pages/NewsPage'
import { BudgetPage } from './pages/BudgetPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { PulsePage } from './pages/PulsePage'
import { ReflectionPage } from './pages/ReflectionPage'
import { TasksPage } from './pages/TasksPage'
import { TodayPage } from './pages/TodayPage'
import { WhatsAppPage } from './pages/WhatsAppPage'
import { GuidePage } from './pages/public/GuidePage'
import { HowItWorksPage } from './pages/public/HowItWorksPage'
import { LandingPage } from './pages/public/LandingPage'
import { PrivacyPage } from './pages/public/PrivacyPage'
import { RoadmapPage } from './pages/public/RoadmapPage'

export function App() {
  const { user, loading } = useAuth()
  // A signed-in visitor hitting /login is sent into the app; the landing page (/)
  // stays reachable for everyone so the brand/logo can always return here.
  const authedHome = !loading && user ? <Navigate to="/today" replace /> : null
  return (
    <Routes>
      {/* Public marketing site — always available, never blocks on the auth check. */}
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="guide" element={<GuidePage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
      </Route>

      {/* Auth */}
      <Route path="login" element={authedHome ?? <AuthPage />} />

      {/* The authenticated app — gated; URLs unchanged from before. */}
      <Route element={<RequireAuth loading={loading} authed={!!user} />}>
        <Route element={<AppShell />}>
          <Route path="today" element={<TodayPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="pulse" element={<PulsePage />} />
          <Route path="email" element={<EmailPage />} />
          <Route path="whatsapp" element={<WhatsAppPage />} />
          <Route path="capture" element={<CapturePage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="ambient" element={<AmbientPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="areas" element={<AreasPage />} />
          <Route path="areas/:id" element={<AreaDetailPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="reflection" element={<ReflectionPage />} />
          <Route path="graph" element={<BrainGraphPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="memory" element={<MemoryPage />} />
        </Route>
      </Route>

      {/* Unknown paths fall back to the landing (which redirects signed-in users to Today). */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RequireAuth({ loading, authed }: { loading: boolean; authed: boolean }) {
  if (loading) {
    return (
      <div className="auth-screen">
        <p className="muted">Loading…</p>
      </div>
    )
  }
  if (!authed) return <Navigate to="/login" replace />
  return <Outlet />
}

function Topbar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const hub = hubForPath(location.pathname)
  const item = navItemForPath(location.pathname)
  return (
    <header className="topbar">
      <nav className="crumbs" aria-label="Breadcrumb">
        {hub && <span className="crumb-section">{hub.label}</span>}
        {hub && item && <ChevronRight size={13} className="crumb-sep" />}
        {item && <span className="crumb-current">{item.label}</span>}
      </nav>
      <div className="topbar-right">
        <button
          type="button"
          className="cmdk-trigger"
          onClick={() => window.dispatchEvent(new Event('cortex:open-cmdk'))}
          title="Search & commands (⌘K)"
        >
          <Search size={14} />
          <span>Search</span>
          <kbd className="cmdk-kbd">⌘K</kbd>
        </button>
        <NotificationsBell />
        <DropdownMenu
          align="right"
          trigger={
            <span className="account-trigger">
              <span className="account-avatar" aria-hidden="true">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </span>
              <span className="topbar-user">{user?.name}</span>
            </span>
          }
        >
          <div className="dropdown-label">
            <span className="dropdown-name">{user?.name}</span>
            <span className="muted small">Local · Private</span>
          </div>
          <button className="dropdown-item" onClick={() => void logout()}>
            <LogOut size={15} /> Log out
          </button>
        </DropdownMenu>
      </div>
    </header>
  )
}

function AppShell() {
  const location = useLocation()
  const dueReminders = useDueReminders()
  const dueCount = dueReminders.data?.length ?? 0
  const newsSummary = useNewsSummary()
  const newsUnread = newsSummary.data?.unreadTotal ?? 0
  const activeHub = hubForPath(location.pathname)?.id

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="app">
          <aside className="sidebar">
            <Link to="/" className="brand" title="Cortex home">
              <BrandMark />
              <span>Cortex</span>
            </Link>
            <nav className="nav">
              <div className="nav-group">
                {PRIMARY.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <item.icon size={17} strokeWidth={2} />
                    <span className="nav-item-label">{item.label}</span>
                    {item.to === '/chat' && dueCount > 0 && (
                      <span className="nav-badge mono">{dueCount > 99 ? '99+' : dueCount}</span>
                    )}
                    {item.to === '/news' && newsUnread > 0 && (
                      <span className="nav-badge mono">{newsUnread > 99 ? '99+' : newsUnread}</span>
                    )}
                  </NavLink>
                ))}
              </div>
              <div className="nav-sep" />
              <div className="nav-group">
                {HUBS.map((hub) => (
                  <Link
                    key={hub.id}
                    to={hub.items[0].to}
                    className={`nav-item nav-hub${activeHub === hub.id ? ' active' : ''}`}
                  >
                    <hub.icon size={17} strokeWidth={2} />
                    <span className="nav-item-label">{hub.label}</span>
                    <ChevronRight size={14} className="nav-hub-caret" />
                  </Link>
                ))}
              </div>
            </nav>
            <div className="sidebar-footer">
              <span className="dot-live" /> Local · Private
            </div>
          </aside>

          <div className="main-wrap">
            <Topbar />
            <main className="content">
              <Outlet />
            </main>
          </div>
        </div>
        <CommandPalette />
      </ConfirmProvider>
    </ToastProvider>
  )
}
