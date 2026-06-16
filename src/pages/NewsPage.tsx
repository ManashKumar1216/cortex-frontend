import { useEffect, useState, type FormEvent } from 'react'

import {
  ChevronDown,
  ExternalLink,
  EyeOff,
  FileText,
  FlaskConical,
  Loader2,
  Moon,
  Newspaper,
  Pin,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
} from 'lucide-react'

import {
  recordNewsEngagement,
  useAddNewsTopic,
  useDeriveTopics,
  useLoadMore,
  useMarkRead,
  useNewsDetail,
  useNewsSummary,
  useNewsTab,
  useNewsTopics,
  useRefreshNews,
  useRemoveNewsTopic,
  useUpdateNewsTopic,
} from '../api/news'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/ui'
import { formatDateTime, formatTime, useTimeFormat, type TimeFormat } from '../lib/time'
import type { NewsItem, NewsSlot, NewsSlotSection, NewsTab, NewsTopic } from '../lib/types'

const TABS: { key: NewsTab; label: string; icon: typeof Newspaper }[] = [
  { key: 'news', label: 'News', icon: Newspaper },
  { key: 'articles', label: 'Articles', icon: FileText },
  { key: 'research', label: 'Research', icon: FlaskConical },
]

const SLOT_META: Record<NewsSlot, { label: string; icon: typeof Sun }> = {
  morning: { label: 'Morning', icon: Sunrise },
  afternoon: { label: 'Afternoon', icon: Sun },
  evening: { label: 'Evening', icon: Sunset },
  night: { label: 'Night', icon: Moon },
}

const SLOT_ORDER: NewsSlot[] = ['morning', 'afternoon', 'evening', 'night']

/** Newest-run slot first (the slot just loaded surfaces on top), populated slots
 *  ahead of empty ones, and any not-yet-run slots kept in time-of-day order. */
function orderSections(sections: NewsSlotSection[]): NewsSlotSection[] {
  return [...sections].sort((a, b) => {
    const aHas = a.items.length > 0 ? 1 : 0
    const bHas = b.items.length > 0 ? 1 : 0
    if (aHas !== bHas) return bHas - aHas
    if (aHas === 1) return (b.runAt ? Date.parse(b.runAt) : 0) - (a.runAt ? Date.parse(a.runAt) : 0)
    return SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)
  })
}

const SOURCE_LABEL: Record<string, string> = {
  google: 'Google News',
  hn: 'Hacker News',
  reddit: 'Reddit',
  arxiv: 'arXiv',
}

function fmtTime(iso: string | null, fmt: TimeFormat): string {
  return iso ? formatTime(iso, fmt) : ''
}

export function NewsPage() {
  const [tab, setTab] = useState<NewsTab>('news')
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const [manage, setManage] = useState(false)
  const timeFmt = useTimeFormat()
  const sections = useNewsTab(tab)
  const summary = useNewsSummary()
  const refresh = useRefreshNews()

  const counts = summary.data?.tabs

  return (
    <div>
      <PageHeader
        title="News"
        subtitle="Your domains, four times a day — news, articles & research"
        action={
          <div className="news-actions">
            <button className="btn ghost sm" onClick={() => setManage(true)} title="Manage topics">
              <Sparkles size={14} /> Topics
            </button>
            <button className="btn primary sm" onClick={() => refresh.mutate(tab)} disabled={refresh.isPending}>
              <RefreshCw size={14} className={refresh.isPending ? 'spin' : undefined} /> {refresh.isPending ? 'Fetching…' : 'Refresh'}
            </button>
          </div>
        }
      />

      <div className="news-tabs">
        {TABS.map((t) => {
          const c = counts?.[t.key]
          return (
            <button key={t.key} className={`news-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              <t.icon size={15} /> {t.label}
              {c && c.unread > 0 && <span className="news-tab-badge">{c.unread}</span>}
            </button>
          )
        })}
      </div>

      {sections.isPending && <p className="muted">Loading…</p>}
      {sections.isError && <p className="error">{(sections.error as Error).message}</p>}

      {sections.data && orderSections(sections.data).map((section) => {
        const meta = SLOT_META[section.slot]
        return (
          <section key={section.slot} className="card news-slot">
            <div className="row-between news-slot-head">
              <h2>
                <meta.icon size={16} /> {meta.label}
              </h2>
              <span className="muted small">
                {section.runAt ? `${fmtTime(section.runAt, timeFmt)} · ` : ''}
                {section.itemCount > 0 ? `${section.readCount}/${section.itemCount} read` : 'not yet'}
              </span>
            </div>
            {section.items.length === 0 ? (
              <p className="muted small">No {tab} for this time slot yet.</p>
            ) : (
              <>
                <div className="news-card-grid">
                  {section.items.map((it) => (
                    <NewsCard key={it.hash} item={it} onOpen={() => setSelected(it)} />
                  ))}
                </div>
                <SectionLoadMore tab={tab} slot={section.slot} exhausted={section.exhausted} />
              </>
            )}
          </section>
        )
      })}

      {selected && <NewsDetail item={selected} onClose={() => setSelected(null)} />}
      {manage && <NewsTopicsModal initialTab={tab} onClose={() => setManage(false)} />}
    </div>
  )
}

function SectionLoadMore({ tab, slot, exhausted }: { tab: NewsTab; slot: NewsSlot; exhausted?: boolean }) {
  const loadMore = useLoadMore()
  const [done, setDone] = useState(false)

  if (exhausted || done) {
    return <p className="news-loadmore-end muted small">That's everything fresh for this slot right now.</p>
  }
  return (
    <div className="news-loadmore">
      <button
        type="button"
        className="btn ghost sm"
        disabled={loadMore.isPending}
        onClick={() =>
          loadMore.mutate(
            { tab, slot },
            { onSuccess: (section) => setDone(!!section.exhausted) },
          )
        }
      >
        {loadMore.isPending ? (
          <>
            <Loader2 size={14} className="spin" /> Finding more…
          </>
        ) : (
          <>
            <ChevronDown size={14} /> Load more
          </>
        )}
      </button>
    </div>
  )
}

function NewsCard({ item, onOpen }: { item: NewsItem; onOpen: () => void }) {
  return (
    <button type="button" className={`news-card${item.read ? ' read' : ''}`} onClick={onOpen}>
      <div className="news-card-top">
        <span className={`news-src-badge src-${item.source}`}>{SOURCE_LABEL[item.source] ?? item.source}</span>
        <span className="news-card-topic">{item.topic}</span>
      </div>
      <div className="news-card-title">{item.title}</div>
      {item.summary && <div className="news-card-summary">{item.summary}</div>}
      <div className="news-card-foot muted small">
        {item.publisher}
        {item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
      </div>
    </button>
  )
}

function NewsDetail({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const markRead = useMarkRead()
  const { mutate: doMarkRead } = markRead
  const timeFmt = useTimeFormat()

  // Summary is normally precomputed (instant). If it's missing, lazy-load it on open.
  const hasPrecomputed = !!item.summary?.trim()
  const lazy = useNewsDetail(item.hash, !hasPrecomputed)

  // Opening the detail marks it read (once per item).
  useEffect(() => {
    if (!item.read) doMarkRead(item.hash)
  }, [item.hash, item.read, doMarkRead])

  const open = () => {
    recordNewsEngagement(item.topic, 'open')
    window.open(item.url, '_blank', 'noopener,noreferrer')
  }

  const summary = hasPrecomputed ? item.summary : (lazy.data?.summary ?? '')
  const author = item.author || lazy.data?.author || ''
  const headlineOnly = hasPrecomputed ? item.headlineOnly : !!lazy.data?.headlineOnly
  const paragraphs = summary.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <Modal title={item.title} onClose={onClose} wide>
      <div className="news-detail">
        <div className="news-detail-meta">
          <span className={`news-src-badge src-${item.source}`}>{SOURCE_LABEL[item.source] ?? item.source}</span>
          <span className="news-card-topic">{item.topic}</span>
          <span className="muted small">
            {item.publisher}
            {item.publishedAt ? ` · ${formatDateTime(item.publishedAt, timeFmt, { withYear: true })}` : ''}
          </span>
        </div>
        {author && <p className="news-detail-author">By {author}</p>}

        {!hasPrecomputed && lazy.isPending ? (
          <p className="muted news-detail-loading">Summarizing…</p>
        ) : (
          <div className="news-detail-summary">
            {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>Open the original to read it.</p>}
            {headlineOnly && (
              <p className="muted small news-detail-note">Headline-based overview — open the original for full details.</p>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn primary" onClick={open}>
            <ExternalLink size={14} /> Open original
          </button>
        </div>
      </div>
    </Modal>
  )
}

const TOPIC_TAB_HINT: Record<NewsTab, string> = {
  news: 'Drives Google News searches; Reddit communities below feed this tab too.',
  articles: 'Drives Hacker News searches — technology, analysis & in-depth writing.',
  research: 'Drives arXiv paper searches — academic & technical topics.',
}

function NewsTopicsModal({ initialTab, onClose }: { initialTab: NewsTab; onClose: () => void }) {
  const [tab, setTab] = useState<NewsTab>(initialTab)
  const topics = useNewsTopics(tab)
  const derive = useDeriveTopics()
  const add = useAddNewsTopic()
  const [kw, setKw] = useState('')
  const [sub, setSub] = useState('')

  const list = topics.data ?? []
  const keywords = list.filter((t) => t.kind === 'keyword')
  const subs = list.filter((t) => t.kind === 'subreddit')

  const submit = (e: FormEvent, kind: 'keyword' | 'subreddit', value: string, reset: () => void) => {
    e.preventDefault()
    const clean = kind === 'subreddit' ? value.trim().replace(/^\/?r\//i, '') : value.trim()
    if (clean) {
      add.mutate({ tab, kind, label: clean })
      reset()
    }
  }

  return (
    <Modal title="News topics" onClose={onClose}>
      <p className="muted small">
        Cortex pulls each feed 4× a day (≈7am, 1pm, 6pm, 10pm), then analyses what it finds and shows the best 10 per slot
        — use “Load more” for the next 10. Each tab keeps its own topic list. Derive auto-fills all three from your areas,
        projects, journal themes &amp; resources.
      </p>

      <div className="news-topic-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`news-topic-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>
      <p className="muted small news-topic-hint">{TOPIC_TAB_HINT[tab]}</p>

      <div className="news-derive">
        <button className="btn ghost sm" onClick={() => derive.mutate()} disabled={derive.isPending}>
          <Sparkles size={13} /> {derive.isPending ? 'Analyzing your data…' : 'Re-derive all tabs from my data'}
        </button>
        {derive.data && <span className="muted small">+{derive.data.created} added</span>}
      </div>

      <h4 className="news-grp">Topics</h4>
      <div className="news-topic-list">
        {keywords.length === 0 && <p className="muted small">No topics yet — derive or add one.</p>}
        {keywords.map((t) => (
          <TopicRow key={t.id} topic={t} />
        ))}
      </div>
      <form className="news-add" onSubmit={(e) => submit(e, 'keyword', kw, () => setKw(''))}>
        <input className="input sm" placeholder="Add a topic (e.g. AI policy)" value={kw} onChange={(e) => setKw(e.target.value)} />
        <button className="btn ghost sm" type="submit" disabled={!kw.trim()}>
          <Plus size={13} /> Add
        </button>
      </form>

      {tab === 'news' && (
        <>
          <h4 className="news-grp">Reddit communities</h4>
          <div className="news-topic-list">
            {subs.length === 0 && <p className="muted small">No subreddits yet.</p>}
            {subs.map((t) => (
              <TopicRow key={t.id} topic={t} sub />
            ))}
          </div>
          <form className="news-add" onSubmit={(e) => submit(e, 'subreddit', sub, () => setSub(''))}>
            <input className="input sm" placeholder="Add a subreddit (e.g. technology)" value={sub} onChange={(e) => setSub(e.target.value)} />
            <button className="btn ghost sm" type="submit" disabled={!sub.trim()}>
              <Plus size={13} /> Add
            </button>
          </form>
        </>
      )}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}

function TopicRow({ topic, sub }: { topic: NewsTopic; sub?: boolean }) {
  const update = useUpdateNewsTopic()
  const remove = useRemoveNewsTopic()
  return (
    <div className={`news-topic-item${topic.muted ? ' muted-topic' : ''}`}>
      <span className="news-topic-label">
        {sub ? `r/${topic.label}` : topic.label}
        {topic.source === 'auto' && <span className="news-auto">auto</span>}
      </span>
      <div className="news-topic-controls">
        <button className={`icon-btn${topic.pinned ? ' on' : ''}`} title={topic.pinned ? 'Unpin' : 'Pin'} onClick={() => update.mutate({ id: topic.id, body: { pinned: !topic.pinned } })}>
          <Pin size={13} />
        </button>
        <button className={`icon-btn${topic.muted ? ' on' : ''}`} title={topic.muted ? 'Unmute' : 'Mute'} onClick={() => update.mutate({ id: topic.id, body: { muted: !topic.muted } })}>
          <EyeOff size={13} />
        </button>
        <button className="icon-btn" title="Remove" onClick={() => remove.mutate(topic.id)}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
