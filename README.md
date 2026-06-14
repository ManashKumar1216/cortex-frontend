# Cortex — Frontend 🧠

The web client for **Cortex**, a local-first, private second brain. React + Vite + TypeScript,
TanStack Query for data, a dark theme, and pages for the Life-OS (Today, Tasks, Habits, Projects,
Goals, Areas, Journal), Chat, and Memory.

This is a **standalone repository**. It talks to the Cortex API (`cortex-backend`, its own repo)
only over HTTP — there is no shared code or build between them.

## Prerequisites

- **Node.js >= 24** (developed on v26; see `.nvmrc`)
- The **Cortex backend** running (default `http://localhost:4000`).

## Getting started

```sh
# 1. Create your local env file from the template
cp env/.env.example env/.env.local

# 2. Install dependencies
npm install

# 3. Run the dev server (http://localhost:5173)
npm run dev
```

> Start the backend first (see the `cortex-backend` repo), then run the frontend in its own terminal.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck then production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src` |

## Configuration

Config lives in `env/`, one file per environment. `vite.config.ts` sets `envDir: './env'`, and Vite
always loads `env/.env.local` for local dev. Only `VITE_`-prefixed keys reach the browser. Real env
files are git-ignored; `env/.env.example` is the committed template.

| Key | Meaning |
|---|---|
| `VITE_PORT` | dev server port (default `5173`) |
| `VITE_API_BASE_URL` | backend base URL (default `http://localhost:4000`) |

## Structure

```
src/
├─ main.tsx            # entry (router + react-query provider)
├─ App.tsx             # sidebar nav + routes
├─ index.css           # design tokens + dark theme
├─ pages/              # Today, Chat, Tasks, Habits, Projects, Goals, Areas, Journal, Memory
├─ api/                # fetch client + entity/chat/memory hooks
├─ components/         # Modal, shared UI, selects
└─ lib/                # types + formatting helpers
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design.
