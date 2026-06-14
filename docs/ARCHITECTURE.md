# Cortex — Architecture

> Living document. Reflects through **Phase 3 (Memory & RAG)**.

## Principles

1. **Local-first / private.** Everything runs on the owner's machine: MongoDB for storage, a local
   LLM (Ollama) for chat, embeddings and memory, local Whisper for voice (Phase 4). Data does not
   leave the machine except through integrations the owner explicitly connects (email, WhatsApp).
2. **Modular monolith.** One deployable backend with clean internal module boundaries. Not
   microservices — wrong cost for a solo build — but structured so a module can later be extracted.
3. **Expand-ready from line one.** Even though there is a single user today:
   - every document carries a `userId`, so multi-tenancy is a filter, not a rewrite;
   - external dependencies sit behind interfaces (`LLMProvider`, `VectorIndex`) so they are
     swappable (local ↔ cloud, scan ↔ ANN) later;
   - the backend is API-first; the frontend is just one client.
4. **Simple to run.** Plain Node projects: `npm run dev` in each repo. No Docker, no build step in
   development (the backend runs through `tsx`).

## Layout (two repositories)

Cortex is split into two **independent repos** that communicate only over HTTP — no shared code,
lockfile or build between them.

```
cortex-backend/              # Node + TypeScript + Express + Mongoose + Ollama
├─ package.json              # standalone (own lockfile)
├─ tsconfig.json · eslint.config.mjs · .prettierrc.json
├─ env/                      # .env.local (gitignored) · .env.example (committed)
└─ src/
   ├─ index.ts               # Express bootstrap + lifecycle (+ starts memory indexer)
   ├─ config/                # loads env/.env.<APP_ENV>, validates (zod), typed config
   ├─ db/                    # Mongoose connection + lifecycle
   ├─ common/                # logger, error middleware, event bus, shared schema/owner
   ├─ api/                   # HTTP route registration
   └─ modules/
      ├─ domain/             # areas, goals, projects, tasks, habits, journal
      ├─ brain/              # conversations, LLM providers (Ollama), RAG-grounded chat
      └─ memory/             # embeddings, vector index, notes, daily rollups, extraction

cortex-frontend/             # React + Vite + TanStack Query
├─ package.json              # standalone (own lockfile)
├─ tsconfig.json · eslint.config.mjs · .prettierrc.json · vite.config.ts
├─ env/                      # .env.local (gitignored) · .env.example (committed)
└─ src/                      # app shell, pages, api client, components
```

Future backend modules (own phases): `capture/` (voice/photo ingest), `integrations/` (email,
WhatsApp), `scheduler/` (reminders, proactive nudges).

## Memory & RAG (Phase 3)

- **Indexing.** Domain writes flow through a tiny in-process **event bus**; the `memory` indexer
  renders each entity to text, embeds it (Ollama `qwen3-embedding:0.6b`), and stores
  `MemoryChunk`s — skipping re-embeds when a content hash is unchanged.
- **Retrieval.** A pluggable `VectorIndex` (current impl: in-memory cached cosine scan, invalidated
  on writes) ranks chunks; the chat duty injects the top matches as grounded context with citations.
- **Notes & conversational memory.** A `Note` entity backs the Memory page; durable facts are also
  auto-extracted from conversations and saved as `source: 'chat'` notes.
- **Daily rollups.** `DailyRollup` summarizes a day's tasks/journal/habits via the LLM and is indexed
  for recall.

## Environment configuration

Config lives in a per-project `env/` folder, one file per environment.

- **Backend** — `src/config/index.ts` resolves `env/.env.${APP_ENV}` (default `local`) via dotenv,
  validates it with zod, exports a single typed `config`. Nothing is hardcoded elsewhere.
- **Frontend** — `vite.config.ts` sets `envDir: './env'`; Vite always loads `env/.env.local` in
  every mode. Only `VITE_`-prefixed keys reach the browser.
- **Git** — `env/.env.*` is ignored except `env/.env.example`, so templates are committed but real
  values never are.

| Key | Repo | Meaning |
|---|---|---|
| `APP_ENV` | backend | which `.env.<APP_ENV>` file to load (default `local`) |
| `PORT` | backend | HTTP port (default `4000`) |
| `MONGODB_URI` | backend | Mongo connection string |
| `FRONTEND_ORIGIN` | backend | allowed CORS origin |
| `OLLAMA_BASE_URL` / `LLM_MODEL` / `EMBED_MODEL` | backend | local LLM + embedding config |
| `RAG_TOP_K` / `RAG_MIN_SCORE` | backend | retrieval tuning |
| `VITE_PORT` | frontend | dev server port (default `5173`) |
| `VITE_API_BASE_URL` | frontend | backend base URL |

## Roadmap (phase by phase)

| Phase | Theme | State |
|---|---|---|
| 0 | Scaffold & local foundation | ✅ done |
| 1 | Life-OS core + dashboard | ✅ done |
| 2 | Local LLM + chat | ✅ done |
| 3 | Memory & RAG (+ notes, conversational memory, daily rollups) | ✅ done |
| 4 | Capture pipeline + voice | planned |
| 5 | Agentic layer + tools/skills | planned |
| 6 | Proactive engine (reminders, reviews, nudges) | planned |
| 7 | Email integration | planned |
| 8 | WhatsApp integration | planned |
| 9 | Hardening & expand-readiness (auth seam, backups, calendar) | planned |
