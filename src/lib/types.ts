export type Status = 'active' | 'paused' | 'done' | 'archived'
export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type FrequencyKind = 'daily' | 'weekdays' | 'times_per_week'

interface Timestamps {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Area extends Timestamps {
  name: string
  description?: string
  color: string
  icon?: string
  code?: string
  codeManual?: boolean
  parentId?: string | null
  order: number
  archived: boolean
}

export interface AreaDetail {
  area: Area
  isLane: boolean
  subAreas: Area[]
  counts: Record<string, number>
}

export interface Goal extends Timestamps {
  title: string
  description?: string
  areaId?: string | null
  status: Status
  targetDate?: string | null
  order: number
}

export interface Project extends Timestamps {
  title: string
  description?: string
  goalId?: string | null
  areaId?: string | null
  status: Status
  weight: number
  startDate?: string | null
  dueDate?: string | null
  order: number
  overdue: boolean
  stagnant: boolean
}

export interface Task extends Timestamps {
  title: string
  notes?: string
  projectId?: string | null
  areaId?: string | null
  urgent: boolean
  important: boolean
  completed: boolean
  completedAt?: string | null
  dueDate?: string | null
  order: number
  quadrant: Quadrant
}

export interface HabitFrequency {
  kind: FrequencyKind
  weekdays?: number[]
  timesPerWeek?: number
}

export interface Habit extends Timestamps {
  name: string
  color: string
  icon?: string
  areaId?: string | null
  frequency: HabitFrequency
  archived: boolean
  currentStreak: number
  bestStreak: number
  dueToday: boolean
  doneToday: boolean
  logDates: string[]
}

export interface JournalEntry extends Timestamps {
  date: string
  title?: string
  content: string
  mood?: number
  areaId?: string | null
  // Reflection layer (Phase 11) — AI-derived, fill-gaps
  aiSummary?: string
  themes?: string[]
  moodSource?: 'manual' | 'ai'
}

export interface Conversation extends Timestamps {
  title: string
}

export interface ChatSource {
  sourceType: string
  sourceId: string
  title: string
  score: number
  url?: string
  /** When the cited capture was recorded (cross-capture chat); ISO string. */
  timestamp?: string
}

// ---- Agent (Phase 5) ----
export interface ToolStep {
  tool: string
  kind: 'read' | 'write'
  status: 'running' | 'done'
  networked?: boolean
}

export type ActionPreview =
  | { type: 'create'; kind: string; fields: { key: string; value: unknown }[] }
  | {
      type: 'update' | 'complete' | 'cancel'
      kind: string
      targetTitle: string
      changes: { key: string; before: unknown; after: unknown }[]
    }
  | { type: 'delete'; kind: string; targetTitle: string; warning: string }
  | { type: 'log' | 'unlog'; kind: string; targetTitle: string; date: string }
  | { type: 'send'; kind: string; to: string; subject: string; body: string }
  | { type: 'failed'; kind: string; reason: string }

export interface ApprovalRequest {
  messageId: string
  toolCallId: string
  tool: string
  op: string
  kind: string
  summary: string
  preview: ActionPreview
}

export type ApprovalDecision = 'approve' | 'edit' | 'cancel'

export interface Skill {
  slug: string
  title: string
  description: string
}

export interface Reminder extends Timestamps {
  title: string
  notes?: string
  remindAt: string
  status: 'pending' | 'done' | 'snoozed' | 'cancelled'
  recurrence?: {
    kind: 'none' | 'daily' | 'weekly' | 'monthly' | 'cron'
    daysOfWeek?: number[]
    dayOfMonth?: number
    cronExpression?: string
    timezone?: string
  }
  firedAt?: string | null
}

// ---- Pulse / proactive engine (Phase 6) ----
export type NoticeKind = 'nudge' | 'daily_review' | 'weekly_review' | 'morning_briefing' | 'agent'
export type NoticeStatus = 'unread' | 'read' | 'dismissed' | 'acted'

export interface Notice extends Timestamps {
  kind: NoticeKind
  type: string
  title: string
  body: string
  severity: 'info' | 'warn' | 'critical'
  status: NoticeStatus
  linkedType?: string
  linkedId?: string
  dedupeKey: string
  source: 'pulse' | 'agent'
  readAt?: string | null
  dismissedAt?: string | null
}

export interface WeeklyReview extends Timestamps {
  weekStart: string
  summary: string
}

// ---- Email integration (Phase 7) ----
export interface EmailEndpoint {
  host: string
  port: number
  secure: boolean
  user: string
}

export interface EmailAccount extends Timestamps {
  label: string
  email: string
  fromName?: string
  imap: EmailEndpoint
  smtp: EmailEndpoint
  foldersToWatch: string[]
  enabled: boolean
  lastUid?: number
}

export type EmailCategory = 'action' | 'fyi' | 'ignore'
export type EmailStatusValue = 'new' | 'triaged' | 'captured' | 'replied' | 'archived'

export interface EmailMessage extends Timestamps {
  accountId: string
  uid: number
  messageId?: string
  from?: string
  to?: string
  subject?: string
  date?: string
  snippet?: string
  bodyText?: string
  triage?: { category: EmailCategory; reason?: string; confidence?: number }
  status: EmailStatusValue
}

export interface EmailIntegrationStatus {
  credKeySet: boolean
  accounts: number
  configured: boolean
}

export interface EmailDraft {
  to: string
  subject: string
  body: string
  inReplyTo?: string
}

// ---- WhatsApp integration (Phase 8) — strictly read-only ingestion ----
export type WhatsAppConnState = 'disconnected' | 'connecting' | 'qr' | 'connected' | 'logged_out'
export type WhatsAppChatKind =
  | 'individual'
  | 'group'
  | 'community'
  | 'newsletter'
  | 'broadcast'
  | 'unknown'

export interface WhatsAppStatus {
  enabled: boolean
  hasSession: boolean
  connection: WhatsAppConnState
  qr: string | null
  lastEventAt?: string | null
  scope: { groups: boolean; archived: boolean }
  counts: { chats: number; messages: number; summaries: number; pendingSuggestions: number }
}

export interface WhatsAppChat {
  jid: string
  name?: string
  kind: WhatsAppChatKind
  archived: boolean
  muted: boolean
  messageCount: number
  lastMessageAt?: string | null
  ingesting: boolean
  excludedReason: string | null
}

export interface WhatsAppSummary extends Timestamps {
  chatJid: string
  chatName?: string
  summary: string
  messageCount: number
  lastMessageAt?: string | null
}

export interface WhatsAppSuggestion extends Timestamps {
  chatJid: string
  chatName?: string
  type: 'event' | 'task'
  title: string
  whenISO?: string
  confidence: number
  status: 'pending' | 'added' | 'dismissed'
  createdEntityType?: string
  createdEntityId?: string
}

export interface Message extends Timestamps {
  conversationId: string
  role: 'system' | 'user' | 'assistant'
  content: string
  model?: string
  sources?: ChatSource[]
}

export interface LLMHealth {
  ok: boolean
  modelPresent: boolean
  model: string
  embedModel: string
  embedModelPresent: boolean
  error?: string
  agentEnabled?: boolean
  webSearch?: { enabled: boolean; provider: string; egress: boolean }
  draftEnabled?: boolean
  crossCaptureEnabled?: boolean
}

/** The owner's inferred "how to talk to me" preference card. */
export interface PreferenceCard {
  content: string
  manual: boolean
  sourceCount: number
  generatedAt?: string
}

export interface MemoryStats {
  total: number
  byType: Record<string, number>
}

export interface ReindexResult {
  sources: number
  chunks: number
  skipped: number
}

export interface Note extends Timestamps {
  title?: string
  content: string
  pinned: boolean
  tags?: string[]
  source: 'manual' | 'chat'
  areaId?: string | null
  superseded?: boolean
  supersededAt?: string | null
  supersedeReason?: string
}

/** A brain-dump item proposed for review before it's written. */
export type DumpItemType = 'task' | 'reminder' | 'event'
export interface DumpItem {
  type: DumpItemType
  title: string
  notes?: string
  when?: string | null
  allDay?: boolean
}

/** A suggested link from a note to a related note/entity (link suggester). */
export interface LinkSuggestion {
  id: string
  targetType: string
  targetId: string
  targetLabel: string
  rationale: string
  score: number
}

/** A Heads-Up "you also noted" resurfacing hit (older-but-relevant memory). */
export interface RelatedItem {
  sourceType: string
  sourceId: string
  title: string
  snippet: string
  score: number
}

export interface ConsolidationResult {
  merged: number
  skipped: number
  pairs: number
  durationMs: number
}

export type ResourceKind = 'link' | 'document' | 'book' | 'prompt'
export type ResourceStatus = 'not_started' | 'in_progress' | 'done' | 'archived'

export interface ResourceFetch {
  status: 'idle' | 'fetched' | 'failed'
  fetchedAt?: string
  siteName?: string
  excerpt?: string
  bytes?: number
  error?: string
}

export interface Resource extends Timestamps {
  kind: ResourceKind
  title: string
  url?: string
  content?: string
  extracted?: string
  areaId?: string | null
  tags?: string[]
  status: ResourceStatus
  pinned: boolean
  source: 'manual' | 'capture' | 'chat'
  fetch?: ResourceFetch
}

export interface CalendarSubscription extends Timestamps {
  label: string
  urlHint: string
  color: string
  enabled: boolean
  lastSyncedAt?: string
  lastStatus: 'idle' | 'ok' | 'error'
  lastError?: string
  eventCount: number
}

export interface CalendarEvent extends Timestamps {
  source: 'ics' | 'email' | 'local'
  status: 'confirmed' | 'suggested' | 'dismissed'
  subscriptionId?: string
  title: string
  start: string
  end?: string
  allDay: boolean
  location?: string
  description?: string
  url?: string
  confidence?: number
}

/** A saved automation: a user-authored scheduled "do this query and report back" job. */
export interface Automation extends Timestamps {
  name: string
  prompt: string
  recurrence?: {
    kind: 'none' | 'daily' | 'weekly' | 'monthly' | 'cron'
    daysOfWeek?: number[]
    dayOfMonth?: number
    cronExpression?: string
    timezone?: string
  }
  nextRunAt: string
  lastRunAt?: string | null
  lastOutput?: string
  lastStatus?: 'ok' | 'error'
  deliver: ('push' | 'inbox')[]
  webSearch: boolean
  enabled: boolean
}

/** An open loop: a commitment, awaited item, or unanswered question tracked until resolved. */
export interface TrackedItem extends Timestamps {
  title: string
  description?: string
  kind: 'open_loop' | 'commitment' | 'question'
  status: 'pending' | 'fulfilled' | 'abandoned'
  dueDate?: string | null
  sourceType?: string
  fulfilledAt?: string | null
}

/** A pre-event prep brief generated shortly before a confirmed, timed event. */
export interface EventBrief extends Timestamps {
  eventId: string
  title: string
  body: string
  eventStart: string
}

export interface DailyRollup extends Timestamps {
  date: string
  summary: string
}

export interface RollupResult {
  date: string
  skipped: boolean
  counts: { tasks: number; habits: number; journal: number }
}

export type CaptureKind = 'text' | 'voice' | 'photo' | 'call'
export type CaptureStatus =
  | 'pending'
  | 'enriching'
  | 'suggested'
  | 'accepted'
  | 'dismissed'
  | 'failed'

export interface CaptureSuggestion {
  entityType: 'task' | 'note' | 'journal' | 'resource' | 'command'
  fields: Record<string, unknown>
  confidence: number
  rationale: string
}

export interface CallActionItem {
  entityType: 'task' | 'reminder'
  fields: Record<string, unknown>
  rationale: string
  status: 'pending' | 'accepted' | 'dismissed'
  resolvedId?: string
}

export interface CallData {
  attendees?: string[]
  summary?: string
  actionItems: CallActionItem[]
  noteId?: string
}

export interface Capture extends Timestamps {
  kind: CaptureKind
  status: CaptureStatus
  text: string
  transcript?: string
  mediaPath?: string
  mimeType?: string
  error?: string
  suggestion?: CaptureSuggestion
  call?: CallData
  resolved?: { type: string; id: string }
}

export interface TodayData {
  date: string
  tasks: {
    doFirst: Task[]
    quadrantCounts: Record<Quadrant, number>
    incompleteTotal: number
    completedToday: number
  }
  projects: Project[]
  habits: { items: Habit[]; doneCount: number; dueTotal: number }
  journal: { entries: JournalEntry[]; hasEntryToday: boolean }
  events?: CalendarEvent[]
}

// ---- News page (tabs · slots · cards) ----
export type NewsSource = 'google' | 'hn' | 'reddit' | 'arxiv'
export type NewsTab = 'news' | 'articles' | 'research'
export type NewsSlot = 'morning' | 'afternoon' | 'evening' | 'night'
export type NewsTopicKind = 'keyword' | 'subreddit'

export interface NewsTopic extends Timestamps {
  tab: NewsTab
  kind: NewsTopicKind
  label: string
  source: 'auto' | 'manual'
  pinned: boolean
  muted: boolean
  weight: number
  areaId?: string | null
}

export interface NewsItem {
  topic: string
  title: string
  url: string
  source: NewsSource
  publisher: string
  publishedAt?: string
  summary: string
  author: string
  headlineOnly: boolean
  hash: string
  read: boolean
}

export interface NewsSlotSection {
  slot: NewsSlot
  runAt: string | null
  itemCount: number
  readCount: number
  items: NewsItem[]
  /** True when the last live "Load more" turned up nothing new — hide the button. */
  exhausted?: boolean
}

export interface NewsSummary {
  tabs: Record<NewsTab, { total: number; unread: number }>
  unreadTotal: number
}

// ---- Reflection layer (Phase 11) ----
export interface MoodPoint {
  date: string
  mood: number
}

export interface MoodStats {
  days: number
  points: MoodPoint[]
  avg7: number | null
  avgWindow: number | null
  trend: 'up' | 'down' | 'flat' | 'none'
  totalEntries: number
  topThemes: { theme: string; count: number }[]
}

export interface DailyPrompt {
  date: string
  text: string
  source: string
}

export interface MorningBriefing extends Timestamps {
  date: string
  body: string
}

export interface JournalSuggestion extends Timestamps {
  entryId: string
  entryDate?: string
  type: 'task' | 'reminder'
  title: string
  whenISO?: string
  confidence: number
  status: 'pending' | 'added' | 'dismissed'
  createdEntityType?: string
  createdEntityId?: string
}

// ---- Insight engine (Phase 12) ----
export type InsightCategory =
  | 'correlation'
  | 'neglect'
  | 'trend'
  | 'spending'
  | 'consistency'
  | 'bottleneck'

export interface Insight extends Timestamps {
  key: string
  category: InsightCategory
  title: string
  detail?: string
  facts: string
  areaId?: string | null
  linkedType?: string
  linkedId?: string
  score: number
  status: 'active' | 'kept' | 'dismissed'
}

// ---- Life Agents (Phase 13) — per-lane persistent coaches ----
export type AgentScoreLabel = 'thriving' | 'steady' | 'at risk' | 'new'

export interface AgentMemory {
  at: string
  note: string
}

export interface LifeAgent extends Timestamps {
  areaId: string
  enabled: boolean
  focus?: string
  cadenceDays: number
  score: number
  scoreLabel: AgentScoreLabel
  coaching: string
  alert?: string | null
  memory: AgentMemory[]
  lastRunAt?: string | null
}

// ---- Analytics (Phase 15) ----
export interface AnalyticsData {
  range: { days: number; from: string; to: string }
  tiles: {
    tasksCompleted: number
    completionRate: number
    openTasks: number
    habitLogs: number
    activeHabits: number
    journalEntries: number
    journalingDays: number
    avgMood: number | null
    captures: number
    activeProjects: number
    activeGoals: number
    spend: number | null
  }
  heatmap: { from: string; to: string; max: number; days: { date: string; count: number }[] }
  throughput: { week: string; created: number; completed: number }[]
  byArea: { areaId: string; name: string; color: string; count: number; pct: number }[]
  quadrants: Record<Quadrant, number>
  habits: { id: string; name: string; color: string; currentStreak: number; bestStreak: number; logs: number; last14: boolean[] }[]
  mood: { points: MoodPoint[]; avg: number | null; trend: MoodStats['trend'] }
  spend: {
    currency: { code: string; symbol: string; locale: string }
    total: number
    byArea: { areaId: string; name: string; color: string; amount: number }[]
    byMonth: { month: string; amount: number }[]
  } | null
  usage: {
    capturesByKind: { text: number; voice: number; photo: number }
    captureTotal: number
    chatTotal: number
    chatByWeek: { week: string; count: number }[]
  }
  goingQuiet: { areas: { name: string }[]; projects: { title: string; weight: number }[] }
}

export interface AnalyticsVerdict extends Timestamps {
  date: string
  body: string
}

// ---- Brain Graph (Phase 12) — deterministic structural node-link view ----
export type GraphNodeType = 'area' | 'goal' | 'project' | 'task' | 'habit' | 'journal' | 'note'

export interface GraphNode {
  id: string
  type: GraphNodeType
  label: string
  areaId: string | null
  color: string | null
  route: string
  done?: boolean
}

export interface GraphEdge {
  source: string
  target: string
  type: 'parent' | 'area' | 'goal' | 'project' | 'link'
}

export interface GraphPayload {
  nodes: GraphNode[]
  edges: GraphEdge[]
  counts: Record<GraphNodeType, number>
  truncated: boolean
}

// ---- Knowledge-gap radar ----
export interface GapGraphNode {
  id: string
  type: string
  title: string
  cluster: number
  /** Representative member of its cluster (anchors the label + bridge endpoints). */
  rep: boolean
}
export interface GapGraphCluster {
  id: number
  size: number
  titles: string[]
}
export interface GapBridge {
  a: number
  b: number
  sim: number
  titlesA: string[]
  titlesB: string[]
  /** Phrased bridging question, if the radar has already surfaced this gap. */
  question?: string
}
export interface GapGraphPayload {
  enabled: boolean
  nodeCount: number
  minNodes: number
  simGate: number
  nodes: GapGraphNode[]
  clusters: GapGraphCluster[]
  gaps: GapBridge[]
}

// ---- Budget (Phase 14) ----
export type TxnType = 'expense' | 'income' | 'card_payment'
export type PaymentKind = 'cash' | 'debit' | 'credit' | 'upi' | 'bank'

export interface Transaction extends Timestamps {
  amount: number
  type: TxnType
  date: string
  areaId?: string | null
  paymentMethodId?: string | null
  note?: string
  source: string
  billId?: string | null
}

export interface PaymentMethod extends Timestamps {
  name: string
  kind: PaymentKind
  last4?: string
  archived: boolean
  creditLimit?: number
  statementDay?: number
  dueDay?: number
}

export interface BudgetTarget {
  areaId: string | null
  monthlyLimit: number
}

export interface Bill extends Timestamps {
  name: string
  amount?: number
  areaId?: string | null
  paymentMethodId?: string | null
  recurrence: { kind: 'monthly' | 'weekly' | 'yearly'; dayOfMonth?: number; weekday?: number }
  nextDue: string
  remindDaysBefore: number
  kind: 'generic' | 'card_payment'
  cardId?: string | null
  active: boolean
  lastPaidOn?: string
}

export interface ExpenseSuggestion extends Timestamps {
  sourceType: 'csv' | 'email_alert' | 'sms' | 'whatsapp' | 'splitwise'
  amount: number
  merchant?: string
  date?: string
  note?: string
  suggestedAreaId?: string | null
  confidence: number
  status: 'pending' | 'added' | 'dismissed'
  createdTransactionId?: string
}

export interface BudgetSummary {
  currency: { code: string; symbol: string; locale: string }
  month: string
  totals: { expense: number; income: number; net: number; count: number }
  overall: { spent: number; limit: number | null; daysLeft: number; pace: string | null; over: boolean }
  byArea: { areaId: string | null; name: string; code: string | null; spent: number; limit: number | null; over: boolean }[]
  byMethod: { paymentMethodId: string | null; name: string; kind: string | null; spent: number }[]
  cards: { id: string; name: string; last4?: string; creditLimit: number | null; outstanding: number; available: number | null; dueDay: number | null }[]
  upcomingBills: { id: string; name: string; amount: number | null; nextDue: string; daysUntil: number; kind: string }[]
  overBudgetAreas: number
}

// --- Ambient listening (Phase 19) ---
export interface AmbientStatus {
  enabled: boolean
  listening: boolean
  stored: number
  retentionDays: number
  tokenSet: boolean
  tokenHint: string | null
  lastIngestAt: string | null
}

export interface AmbientTranscript extends Timestamps {
  text: string
  lang: string
  source: 'webhook' | 'browser'
  capturedAt: string
  durationSec?: number
}
