/**
 * Single source of truth for the public marketing site (landing, guide, privacy,
 * how-it-works, roadmap). Kept honest: every feature here maps to a real route and
 * a real backend capability. Every outbound path is listed with its default state.
 */
import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CheckSquare,
  Flame,
  FolderKanban,
  Gauge,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  Mail,
  MessageCircle,
  MessageSquare,
  Network,
  Radio,
  Sparkles,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type BadgeKind = 'ok' | 'warn' | 'info' | 'muted' | 'done'

export interface Feature {
  name: string
  icon: LucideIcon
  line: string
  /** A small honest flag, e.g. read-only / opt-in / needs approval. */
  badge?: { text: string; kind: BadgeKind }
  /** Privacy-critical surfaces get a left-accent stripe like .nav-item.active. */
  guarded?: boolean
}

/** The real sidebar, in order — the landing showcase walks these verbatim. */
export const FEATURES: Feature[] = [
  { name: 'Today', icon: LayoutDashboard, line: 'Your day at a glance — priorities, habits, mood, a morning briefing, upcoming calendar events, and a topic news digest.' },
  { name: 'Chat', icon: MessageSquare, line: 'A local AI that reads and writes your data behind a confirm-before-write gate, citing its sources.', badge: { text: 'Needs approval', kind: 'warn' }, guarded: true },
  { name: 'Pulse', icon: Bell, line: 'Proactive nudges for overdue tasks, stagnant projects, and at-risk streaks — surfaced once, never nagging.' },
  { name: 'Capture', icon: Inbox, line: 'Dump a thought; Cortex files it. Text, voice, photo, a link, or a recorded call — classified into a task, note, journal, or transaction.' },
  { name: 'Ambient', icon: Radio, line: 'Optional passive capture from your mic or phone, transcribed to text locally and auto-erased after two weeks. Off until you switch it on.', badge: { text: 'Off by default', kind: 'muted' }, guarded: true },
  { name: 'Email', icon: Mail, line: 'IMAP/SMTP mailboxes, AI-triaged into action vs. FYI, with drafted replies that wait for your approval.', badge: { text: 'Optional', kind: 'info' }, guarded: true },
  { name: 'WhatsApp', icon: MessageCircle, line: 'Read-only consolidation into summaries and suggestions. It never sends, replies, or runs commands.', badge: { text: 'Read-only', kind: 'muted' }, guarded: true },
  { name: 'Tasks', icon: CheckSquare, line: 'The Eisenhower matrix, Q1–Q4. Cortex flags overdue do-now items.' },
  { name: 'Habits', icon: Flame, line: 'Streaks build identity. Daily, weekday, or X-times-a-week, with current and best streaks.' },
  { name: 'Projects', icon: FolderKanban, line: 'Status, life-impact weight, and deadlines; stagnant projects get a gentle check-in.' },
  { name: 'Goals', icon: Target, line: 'What you are working toward, organized by area.' },
  { name: 'Budget', icon: Wallet, line: 'Spend by area — monthly targets, recurring bills, card balances, and CSV or bank-email imports you confirm before they post.' },
  { name: 'Areas', icon: LayoutGrid, line: 'The lanes of your life, two levels deep (A, A.1, A.2). Each lane can run an opt-in Life Agent that scores its health and coaches you.' },
  { name: 'Journal', icon: BookOpen, line: 'A line a day. Cortex extracts mood, themes, and follow-ups — never overwriting a mood you set.' },
  { name: 'Reflection', icon: Sparkles, line: 'Cross-domain insights, mood trends and themes, and AI-spotted follow-ups you accept or dismiss.' },
  { name: 'Graph', icon: Network, line: 'Your whole second brain as a living map — areas, goals, projects, tasks, habits, and notes, wired by their real links.' },
  { name: 'Analytics', icon: BarChart3, line: 'A holistic dashboard — completion rates, a year-long activity heatmap, mood and spending trends, and an AI verdict on your numbers.' },
  { name: 'Memory', icon: Brain, line: 'Notes, chat-learned facts, and a saved resource library — all embedded locally so chat can recall them.' },
]

export interface Pillar {
  icon: LucideIcon
  title: string
  body: string
}

export const PILLARS: Pillar[] = [
  {
    icon: Brain,
    title: 'Grounded in you',
    body: 'Answers are drawn from your own tasks, notes, and journal via local retrieval — with sources. It refuses to guess.',
  },
  {
    icon: MessageSquare,
    title: 'Asks before it acts',
    body: 'The agent can create tasks, update projects, or draft email — but every write shows a before/after preview and waits for your yes.',
  },
  {
    icon: Bell,
    title: 'Proactive, not nagging',
    body: 'Pulse surfaces what is slipping — once per subject — and learns to stay quiet when you would rather it did.',
  },
  {
    icon: Lightbulb,
    title: 'Sees the whole picture',
    body: 'It finds patterns across your life — cross-domain insights, per-lane Life Agents that score and coach, an analytics dashboard, and a living graph of how it all connects.',
  },
]

/** The intelligence layer — capabilities that live across pages, not in one room. */
export interface IntelItem {
  icon: LucideIcon
  title: string
  body: string
}

export const INTELLIGENCE: IntelItem[] = [
  {
    icon: Lightbulb,
    title: 'Insight engine',
    body: 'Deterministic detectors surface real cross-domain patterns — mood vs. habits, neglected areas, spending trends, streak momentum. The model only phrases the numbers; it can never invent a correlation.',
  },
  {
    icon: Gauge,
    title: 'Life Agents',
    body: 'Opt-in per-lane coaches score each area’s health 0–100 and raise a Pulse alert only when a multi-week pattern slips. They advise — they never write to your data.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    body: 'A read-only dashboard: completion rates, a year-long activity heatmap, task throughput, mood and spending trends, and an on-demand AI verdict on your numbers.',
  },
  {
    icon: Network,
    title: 'Brain graph',
    body: 'Your whole second brain as a force-directed map — every area, goal, project, task, habit, and note, wired by its real references. Filter, search, and click straight into anything.',
  },
]

export interface Step {
  n: string
  title: string
  body: string
}

export const STEPS: Step[] = [
  { n: '01', title: 'Run it on your machine', body: 'MongoDB and Ollama (gemma4:12b for chat, qwen3-embedding for memory). Backend on :4000, frontend on :5173.' },
  { n: '02', title: 'Create a local account', body: 'Sign-up is stored on your disk; the session lives in an httpOnly cookie. No cloud identity, no email verification.' },
  { n: '03', title: 'Feed it your life', body: 'Capture thoughts, log habits, write a line in the journal. Cortex indexes everything into private memory as you go.' },
  { n: '04', title: 'Ask, and approve', body: 'Chat grounded in your data. When the agent wants to write or send, it previews the change and waits for your nod.' },
]

/** What never leaves the machine. */
export const STAYS_LOCAL: string[] = [
  'Tasks, projects, goals, and areas',
  'Habits and their logs',
  'Journal entries, moods, and themes',
  'Long-term memory, notes, and embeddings',
  'Insights, analytics, and the brain graph',
  'Calendar events and budget records',
  'WhatsApp and ambient transcripts',
  'Daily rollups and weekly reviews',
  'Email bodies, once fetched',
  'Your account and session',
]

/**
 * Every way anything can leave the machine — the honest, complete map. Each path
 * carries its default state: most are off until you wire them; two are on but easy
 * to disable, and never upload your data.
 */
export interface EgressPath {
  title: string
  body: string
  flag: { text: string; kind: BadgeKind }
}

export const EGRESS_PATHS: EgressPath[] = [
  {
    title: 'News digest',
    body: 'Today’s digest pulls public headlines from Google News, Hacker News, and Reddit for topics derived from your data. Only the topic keywords go out — nothing of yours is uploaded, and the articles are never added to memory. Switch fetching off and Today stays offline.',
    flag: { text: 'On by default', kind: 'warn' },
  },
  {
    title: 'Resource fetch',
    body: 'Saving a link can fetch that one page’s readable text so it becomes searchable. It fires only when you save a URL — rate-limited, byte-capped, and easy to turn off.',
    flag: { text: 'On · you initiate', kind: 'info' },
  },
  {
    title: 'Web search',
    body: 'Off until you add a provider key. After that, only a query you trigger is sent — rate-limited, and every one logged for you to see.',
    flag: { text: 'Off by default', kind: 'muted' },
  },
  {
    title: 'Calendar feeds',
    body: 'Paste a read-only iCal URL and Cortex fetches it periodically to show upcoming events. It only ever reads; it never writes back to any calendar.',
    flag: { text: 'You add the feed', kind: 'info' },
  },
  {
    title: 'Email',
    body: 'IMAP/SMTP mailboxes you configure. Cortex polls for mail and sends only the replies you approve. Passwords are encrypted before storage and never returned.',
    flag: { text: 'You configure it', kind: 'info' },
  },
  {
    title: 'WhatsApp',
    body: 'Pair as a linked device and Cortex reads to summarize — it never sends. Your messages stay local; only the device connection itself talks to WhatsApp.',
    flag: { text: 'Read-only · you pair', kind: 'muted' },
  },
]

export interface GuideSection {
  id: string
  title: string
  /** Paragraphs of prose. */
  body: string[]
  /** Optional bullet list rendered after the prose. */
  bullets?: string[]
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    body: [
      'Cortex is your second brain, and it lives on your machine. It combines a full life-management system — tasks, habits, projects, goals, journal, areas, and budget — with an AI that understands all of it, finds patterns across it, and acts on your behalf behind an approval gate.',
      'Everything in this guide is what actually runs locally: a local model (Ollama) and a local database (MongoDB) do the work. A few outbound paths exist — a news digest, optional web search, calendar feeds, and integrations you wire yourself — and every one is listed plainly on the Privacy page. Nothing else leaves.',
    ],
  },
  {
    id: 'getting-started',
    title: 'Getting started',
    body: [
      'You need Node 24+, a local MongoDB, and Ollama with two models pulled: gemma4:12b for reasoning and qwen3-embedding:0.6b for memory. Start the backend on :4000 and the frontend on :5173, then create your account — it is stored locally, with the session in an httpOnly cookie. No email verification.',
      'If you ever hit a login wall, that is the whole app: Cortex gates behind your local account, and there is no public dashboard of your data.',
    ],
    bullets: [
      'Open Today to see your dashboard.',
      'Capture one thought from the Capture page.',
      'Log one habit and write one line in the Journal.',
      'Open Chat and ask it something about what you just entered — feel the grounding.',
    ],
  },
  {
    id: 'chat',
    title: 'Chat — the agent, grounded and gated',
    body: [
      'Chat streams responses and grounds them in your data using local retrieval, showing source chips for the tasks, projects, journal entries, or notes it drew on. It runs a ReAct tool-calling loop over roughly forty tools: read tools (search_memory, list_tasks) run immediately, but every write — create_task, update_project, send_email, delete — pauses on an approval card with a before/after preview.',
      'Approve, Edit, or Cancel. Nothing is written without your nod. Skills like Plan my day, Triage inbox, and Weekly review scope the agent to a goal and a limited tool set. Web search, if you have enabled it, shows an egress notice and web chips when used.',
    ],
  },
  {
    id: 'pulse',
    title: 'Pulse — proactive, never nagging',
    body: [
      'Detectors scan your data in the background — stagnant projects, overdue Q1 tasks, habit-streak risk, journal gaps, action emails, bills due, over-budget areas, and Life Agent alerts — and surface notices ranked by severity. A nudge appears once per subject and is phrased in about 25 words.',
      'Dismissal teaches Cortex: the same nudge will not return, and three dismissals of a type quiets that whole category for a while. Quiet hours are respected. Pulse also delivers your daily rollups, weekly reviews, and morning briefings here; "open" navigates to the related page.',
    ],
  },
  {
    id: 'capture',
    title: 'Capture — dump a thought, Cortex files it',
    body: [
      'Type a thought, record a voice memo (transcribed locally via Whisper), snap a photo (text extracted), save a link, or record a call or meeting. Cortex classifies each into a task — with urgent/important flags and a due date — or a note, journal entry, transaction, or resource, and shows a suggestion card with its reasoning.',
      'Accept it, edit it before filing, or dismiss it. Calls are transcribed and summarized with attendees and individual action items you can add. The goal is inbox-zero, and voice, photo, and call capture are all optional capabilities.',
    ],
  },
  {
    id: 'ambient',
    title: 'Ambient — optional passive capture',
    body: [
      'Off by default, and clearly so: Ambient stays dark until you switch it on. When you do, it captures audio passively — from your browser mic in short segments, or from a phone via a token-authed webhook — and transcribes it to text locally with Whisper (Hindi and English auto-detected).',
      'Only the transcript is kept; the audio is discarded. Transcripts auto-purge after a retention window (14 days by default), and a one-tap "Forget all" wipes them immediately. A synthesis button distils the last week into context. Nothing is uploaded.',
    ],
  },
  {
    id: 'email',
    title: 'Email — triaged inbox with drafted replies',
    body: [
      'Setup first: Email needs an encryption key (EMAIL_CRED_KEY), then you add mailboxes with IMAP/SMTP. Passwords are encrypted before storage and never returned to the screen.',
      'Cortex polls, triages each message into action / FYI / ignore, embeds actionable ones into memory, and can draft a reply you approve before send. It can also surface events and bank transaction alerts found in mail as confirm-before-write suggestions. Filter by "Needs action" vs "FYI"; sending updates the original message to "replied".',
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp — read-only consolidation',
    body: [
      'Read-only, up front: Cortex never sends, replies, or runs commands. It requires WHATSAPP_ENABLED and a QR pairing.',
      'Once paired, you get a stat row (chats, messages, summaries, pending suggestions) and three tabs: Suggestions (AI-spotted events and to-dos to add), Summaries (rolling chat summaries), and Chats (with a mute toggle per chat).',
    ],
  },
  {
    id: 'calendar-news',
    title: 'Calendar & News — your day, in context',
    body: [
      'Calendar is read-only. Paste a secret iCal URL under Today → Feeds and Cortex fetches it periodically to show upcoming events; it also extracts events from your email as confirm-before-write suggestions. It never writes back to any calendar, and dismissed events never resurface.',
      'The News digest groups headlines by topic on Today, refreshed through the day from free, keyless public sources (Google News, Hacker News, Reddit) for topics derived from your data — which you can edit. Only the topic keywords leave; the articles are not added to your memory, and you can turn fetching off entirely.',
    ],
  },
  {
    id: 'life-os',
    title: 'Tasks, Habits, Projects, Goals & Areas',
    body: [
      'Tasks live on the Eisenhower matrix — Q1 do-now, Q2 schedule, Q3 delegate, Q4 drop — and overdue Q1 items get flagged. Habits run daily, on weekdays, or X-times-a-week, tracking current and best streaks. Projects carry a status, a life-impact weight (1–10), and deadlines; stagnant (14+ days) and overdue projects are caught for you. Goals are the higher-level outcomes projects ladder up to.',
      'Areas are the spine: a two-level hierarchy of lanes (A, B, C) and sub-areas (A.1, A.2) with auto-derived or manual codes. Every entity — tasks, projects, habits, journal, spending — files under an area, and each area’s detail page rolls up its counts and lets you enable that lane’s Life Agent.',
    ],
  },
  {
    id: 'journal-reflection',
    title: 'Journal & Reflection — write, then understand',
    body: [
      'Journaling is a line a day. Cortex extracts a mood (1–5), themes, a summary, and up to five follow-up actions — but it never overwrites a mood you set by hand.',
      'Reflection shows the daily prompt, a mood chart over 7/30/90-day windows with a trend, your top themes, the cross-domain insights Cortex has spotted, and the follow-ups it suggests — which you Add (still approval-gated) or dismiss.',
    ],
  },
  {
    id: 'intelligence',
    title: 'Insights, Life Agents, Analytics & Graph',
    body: [
      'Cortex does not just store — it notices. The Insight engine runs deterministic detectors over your data (mood vs. habits, neglected areas, spending trends, streak momentum) and the local model only phrases the real numbers into a headline — it can never invent a correlation. You keep or dismiss each on Reflection; kept ones feed memory.',
      'Life Agents are opt-in coaches you enable per lane from an area’s detail page. On a cadence, each computes a 0–100 domain-health score, writes one gentle note, and raises a Pulse alert only when a worsening multi-week pattern warrants. They advise; they never write to your data.',
      'Analytics is a holistic, read-only dashboard: completion rates, a year-long activity heatmap, task throughput, mood and spending trends, and an on-demand AI "verdict" that interprets your numbers. The Brain Graph renders your whole second brain as a force-directed map — areas, goals, projects, tasks, habits, and notes wired by their real references — that you can filter, search, and click into.',
    ],
  },
  {
    id: 'budget',
    title: 'Budget — money as a view of your areas',
    body: [
      'Spending files under the same area taxonomy as everything else, in a single currency. Set per-area and overall monthly targets; track recurring bills (including a credit-card "pay the bill") that surface in Pulse a few days before they are due; and keep payment methods with card balances.',
      'You can import expenses from a CSV statement, and — if you enable it — let Cortex parse bank transaction-alert emails. Both arrive as confirm-before-write suggestions: nothing posts to your ledger until you say so.',
    ],
  },
  {
    id: 'memory',
    title: 'Memory — the long-term brain',
    body: [
      'Memory fills three ways: notes you write, durable facts Cortex learns from your chats, and a Resources library — links, documents, books, and reusable prompts you save deliberately. Each is embedded by your local model so search can recall it; pin to prioritize, delete to forget.',
      'Every entity change re-renders to text and re-embeds locally — that is why Chat can cite your past. Saving a link can optionally fetch that page’s text so it is searchable too. The Memory page also generates daily summaries on demand.',
    ],
  },
  {
    id: 'reviews',
    title: 'Reviews & briefings — closure and direction',
    body: [
      'Cortex keeps a reflective rhythm, all generated locally from your own data: a Morning Briefing (your top priority and why, a couple more, a reflection prompt), a Daily Rollup (a warm, factual end-of-day summary), and a Weekly Review (wins, slips, themes, and one thing to drop).',
      'Each runs at a configurable hour or day and appears in Pulse and Memory.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & control',
    body: [
      'The guarantee, in plain terms: a local LLM, a local database, no telemetry, and no account on anyone else’s server. Every agent write is gated by your approval, and dismissals tune what Pulse shows.',
      'A handful of outbound paths exist, and the Privacy page maps every one: a news digest and resource fetch (on by default, easily turned off, never uploading your data), web search (off until you add a key), calendar feeds and email (you wire them), and read-only WhatsApp. Ambient capture is off until you enable it, keeps only transcripts, and auto-purges them. Want to verify? Watch your network tab — with those off, it stays quiet.',
    ],
  },
]

export interface RoadmapPhase {
  label: string
  title: string
  status: 'done' | 'now' | 'planned'
  items: string[]
}

export const ROADMAP: RoadmapPhase[] = [
  {
    label: 'Foundations',
    title: 'The life-OS',
    status: 'done',
    items: ['Tasks, habits, projects, goals, and areas', 'Journal with AI mood, themes, and summaries', 'Today dashboard, reminders, and morning briefings'],
  },
  {
    label: 'Memory & RAG',
    title: 'A brain that recalls',
    status: 'done',
    items: ['Local embeddings of every entity', 'Grounded chat with cited sources', 'A resource library, indexed locally'],
  },
  {
    label: 'Agentic',
    title: 'A mind that acts',
    status: 'done',
    items: ['ReAct tool-calling loop over ~40 tools', 'Confirm-before-write approval gate', 'Skills: plan my day, weekly review, triage inbox'],
  },
  {
    label: 'Proactive',
    title: 'Pulse & reviews',
    status: 'done',
    items: ['Detectors for stagnant projects, overdue tasks, streak risk', 'Dismissal-learning and quiet hours', 'Daily rollups, weekly reviews, morning briefings'],
  },
  {
    label: 'Integrations',
    title: 'Email, WhatsApp & capture',
    status: 'done',
    items: ['IMAP/SMTP triage with drafted replies', 'Read-only WhatsApp consolidation', 'Voice, photo, and call/meeting capture'],
  },
  {
    label: 'Intelligence',
    title: 'It connects the dots',
    status: 'done',
    items: ['Insight engine across mood, habits, and spend', 'Per-lane Life Agents that score and coach', 'Analytics dashboard and a living brain graph'],
  },
  {
    label: 'Money & time',
    title: 'Budget, calendar, multi-owner',
    status: 'done',
    items: ['Area-based budgeting, bills, and card balances', 'Read-only iCal feeds and email-found events', 'Multi-owner accounts, each fully isolated'],
  },
  {
    label: 'Ambient & news',
    title: 'Always-on, on your terms',
    status: 'now',
    items: ['Passive mic/phone capture — transcript-only, auto-purged', 'A topic news digest on Today, from free sources', 'Hindi + English across capture and digest'],
  },
  {
    label: 'Horizon',
    title: 'Ideas, not promises',
    status: 'planned',
    items: ['Optional cloud LLM providers — still your choice', 'More capture sources into the same confirm-first seam', 'Deeper analytics and agent autonomy you control'],
  },
]
