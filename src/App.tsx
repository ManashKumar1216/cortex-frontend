import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CheckSquare,
  Flame,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Mail,
  MessageCircle,
  MessageSquare,
  Network,
  Newspaper,
  Radio,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react'
import { LogOut } from 'lucide-react'
import { Link, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { useNewsSummary } from './api/news'
import { useUnreadCount } from './api/pulse'
import { useDueReminders } from './api/reminders'
import { useAuth } from './auth/AuthContext'
import { PublicLayout } from './components/public/PublicLayout'
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

const NAV = [
  { to: '/today', label: 'Today', icon: LayoutDashboard },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/pulse', label: 'Pulse', icon: Bell },
  { to: '/capture', label: 'Capture', icon: Inbox },
  { to: '/ambient', label: 'Ambient', icon: Radio },
  { to: '/email', label: 'Email', icon: Mail },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/habits', label: 'Habits', icon: Flame },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/budget', label: 'Budget', icon: Wallet },
  { to: '/areas', label: 'Areas', icon: LayoutGrid },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/reflection', label: 'Reflection', icon: Sparkles },
  { to: '/graph', label: 'Graph', icon: Network },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/memory', label: 'Memory', icon: Brain },
]

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

function AppShell() {
  const { user, logout } = useAuth()
  const dueReminders = useDueReminders()
  const dueCount = dueReminders.data?.length ?? 0
  const unread = useUnreadCount()
  const pulseCount = unread.data?.count ?? 0
  const newsSummary = useNewsSummary()
  const newsUnread = newsSummary.data?.unreadTotal ?? 0
  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="brand" title="Cortex home">
          <span className="logo">🧠</span> Cortex
        </Link>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
              {item.to === '/chat' && dueCount > 0 && (
                <span className="nav-badge mono">{dueCount}</span>
              )}
              {item.to === '/pulse' && pulseCount > 0 && (
                <span className="nav-badge mono">{pulseCount}</span>
              )}
              {item.to === '/news' && newsUnread > 0 && (
                <span className="nav-badge mono">{newsUnread > 99 ? '99+' : newsUnread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="muted">Local · Private</span>
          </div>
          <button className="icon-btn" aria-label="Log out" title="Log out" onClick={() => void logout()}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
