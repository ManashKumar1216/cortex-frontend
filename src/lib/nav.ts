import {
  Antenna,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Flame,
  FolderKanban,
  Gamepad2,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  ListPlus,
  Mail,
  MessageCircle,
  MessageSquare,
  Network,
  Newspaper,
  Radar,
  Radio,
  Repeat,
  Settings,
  Sparkles,
  Target,
  Telescope,
  Wallet,
  Wand2,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export interface Hub {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
}

/** High-frequency standalone destinations — always one click away. */
export const PRIMARY: NavItem[] = [
  { to: '/today', label: 'Today', icon: LayoutDashboard },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/skills', label: 'Skills', icon: Wand2 },
  { to: '/capture', label: 'Capture', icon: Inbox },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/budget', label: 'Budget', icon: Wallet },
  { to: '/games', label: 'Games', icon: Gamepad2 },
]

/** The long tail, collapsed into hubs. Each hub's surfaces show as sub-tabs. */
export const HUBS: Hub[] = [
  {
    id: 'plan',
    label: 'Plan',
    icon: ListChecks,
    items: [
      { to: '/tasks', label: 'Tasks', icon: CheckSquare },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/habits', label: 'Habits', icon: Flame },
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/goals', label: 'Goals', icon: Target },
      { to: '/areas', label: 'Areas', icon: LayoutGrid },
    ],
  },
  {
    id: 'flow',
    label: 'Flow',
    icon: Workflow,
    items: [
      { to: '/braindump', label: 'Brain dump', icon: ListPlus },
      { to: '/automations', label: 'Automations', icon: Repeat },
    ],
  },
  {
    id: 'reflect',
    label: 'Reflect',
    icon: Telescope,
    items: [
      { to: '/journal', label: 'Journal', icon: BookOpen },
      { to: '/reflection', label: 'Reflection', icon: Sparkles },
      { to: '/graph', label: 'Graph', icon: Network },
      { to: '/gaps', label: 'Gaps', icon: Radar },
      { to: '/memory', label: 'Memory', icon: Brain },
    ],
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: Antenna,
    items: [
      { to: '/email', label: 'Email', icon: Mail },
      { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
      { to: '/ambient', label: 'Ambient', icon: Radio },
    ],
  },
]

/** Pulse is reached via the topbar bell, not the sidebar — but stays in ⌘K. */
export const PULSE_ITEM: NavItem = { to: '/pulse', label: 'Pulse', icon: Bell }

/** Utility destinations pinned to the very bottom of the sidebar (above the footer). */
export const SETUP_ITEM: NavItem = { to: '/setup', label: 'Setup guide', icon: ClipboardCheck }
export const SETTINGS_ITEM: NavItem = { to: '/settings', label: 'Settings', icon: Settings }
export const PINNED: NavItem[] = [SETUP_ITEM, SETTINGS_ITEM]

/** Flat list for the command palette (every reachable surface). */
export const NAV_ITEMS: NavItem[] = [
  ...PRIMARY,
  ...HUBS.flatMap((h) => h.items),
  ...PINNED,
  PULSE_ITEM,
]

/** The hub that owns a path (for the sub-nav + breadcrumb), if any. */
export function hubForPath(pathname: string): Hub | undefined {
  return HUBS.find((h) => h.items.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`)))
}

/** The nav item matching a path (for the breadcrumb / topbar title). */
export function navItemForPath(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
}
