import { Suspense, lazy, useEffect, useState } from 'react'

import { ChevronRight, LogOut, Menu, Search, Settings as SettingsIcon } from 'lucide-react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { useNewsSummary } from './api/news'
import { useDueReminders } from './api/reminders'
import { useSettings } from './api/settings'
import { useAuth } from './auth/AuthContext'
import { setTimeFormatPref } from './lib/time'
import { CommandPalette } from './components/CommandPalette'
import { NotificationsBell } from './components/NotificationsBell'
import { PublicLayout } from './components/public/PublicLayout'
import { BrandMark, ConfirmProvider, DropdownMenu, ToastProvider } from './components/ui'
import { HUBS, PINNED, PRIMARY, hubForPath, navItemForPath } from './lib/nav'
import { AuthPage } from './pages/AuthPage'
import { AreaDetailPage } from './pages/AreaDetailPage'
import { AreasPage } from './pages/AreasPage'
import { AmbientPage } from './pages/AmbientPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AutomationsPage } from './pages/AutomationsPage'
import { BrainDumpPage } from './pages/BrainDumpPage'
import { BrainGraphPage } from './pages/BrainGraphPage'
import { CalendarPage } from './pages/CalendarPage'
import { CapturePage } from './pages/CapturePage'
import { ChatPage } from './pages/ChatPage'
import { EmailPage } from './pages/EmailPage'
import { GapsPage } from './pages/GapsPage'
import { GoalsPage } from './pages/GoalsPage'
import { HabitsPage } from './pages/HabitsPage'
import { JournalPage } from './pages/JournalPage'
import { MemoryPage } from './pages/MemoryPage'
import { NewsPage } from './pages/NewsPage'
import { BudgetPage } from './pages/BudgetPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { PulsePage } from './pages/PulsePage'
import { ReflectionPage } from './pages/ReflectionPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupGuidePage } from './pages/SetupGuidePage'
import { SkillsPage } from './pages/SkillsPage'
import { TasksPage } from './pages/TasksPage'
import { TodayPage } from './pages/TodayPage'
import { WhatsAppPage } from './pages/WhatsAppPage'
// Games pull in Phaser (~1MB) — lazy-load them into their own chunk.
const GamesPage = lazy(() => import('./pages/GamesPage').then((m) => ({ default: m.GamesPage })))
const GamePlayPage = lazy(() => import('./pages/GamePlayPage').then((m) => ({ default: m.GamePlayPage })))

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
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/:slug" element={<GamePlayPage />} />
          <Route path="areas" element={<AreasPage />} />
          <Route path="areas/:id" element={<AreaDetailPage />} />
          <Route path="automations" element={<AutomationsPage />} />
          <Route path="braindump" element={<BrainDumpPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="reflection" element={<ReflectionPage />} />
          <Route path="graph" element={<BrainGraphPage />} />
          <Route path="gaps" element={<GapsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="memory" element={<MemoryPage />} />
          <Route path="skills" element={<SkillsPage />} />
          <Route path="setup" element={<SetupGuidePage />} />
          <Route path="settings" element={<SettingsPage />} />
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

function Topbar({ onMenu }: { onMenu: () => void }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const hub = hubForPath(location.pathname)
  const item = navItemForPath(location.pathname)
  return (
    <header className="topbar">
      <button type="button" className="topbar-hamburger" aria-label="Open menu" onClick={onMenu}>
        <Menu size={18} />
      </button>
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
          <Link className="dropdown-item" to="/settings">
            <SettingsIcon size={15} /> Settings
          </Link>
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
  // Mobile nav drawer — closes automatically whenever the route changes.
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => setNavOpen(false), [location.pathname])

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="app">
          {navOpen && <div className="nav-overlay" onClick={() => setNavOpen(false)} />}
          <aside className={`sidebar${navOpen ? ' open' : ''}`}>
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
            <div className="nav-pinned">
              {PINNED.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <item.icon size={17} strokeWidth={2} />
                  <span className="nav-item-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
            <div className="sidebar-footer">
              <span className="dot-live" /> Local · Private
            </div>
          </aside>

          <div className="main-wrap">
            <Topbar onMenu={() => setNavOpen(true)} />
            <main className="content">
              <Suspense fallback={<p className="muted">Loading…</p>}>
                <Outlet />
              </Suspense>
            </main>
          </div>
        </div>
        <CommandPalette />
        <TimeFormatSync />
      </ConfirmProvider>
    </ToastProvider>
  )
}

/** Mirrors the saved TIME_FORMAT setting into the app-wide clock store. */
function TimeFormatSync() {
  const settings = useSettings()
  const pref = settings.data?.values?.TIME_FORMAT
  useEffect(() => {
    setTimeFormatPref(typeof pref === 'string' ? pref : '24h')
  }, [pref])
  return null
}
