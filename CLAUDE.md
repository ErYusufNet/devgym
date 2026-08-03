# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DevGym (FastAPI title / frontend metadata: "ErNord") helps unemployed and early-career developers
gain real team experience by collaborating on non-commercial software projects: publish a project,
build a team, ship it together on GitHub. Early MVP, under active development, no deployment yet.

Core domain mechanic: the "handoff" — when a team member leaves a project, their position reopens
(`PositionStatus.open`) so someone else can take over. See `leave_team` in `backend/main.py`.

## Commands

**Backend** (from `backend/`)
```
venv\Scripts\Activate.ps1
uvicorn main:app --reload
```
Runs on http://127.0.0.1:8000, interactive docs at `/docs`. SQLite db (`devgym.db`) and its tables
are created automatically on startup via `models.Base.metadata.create_all`; there are no migrations
(no Alembic) — schema changes require deleting `devgym.db` to pick up new columns/tables.

**Frontend** (from `frontend/`)
```
npm run dev      # dev server, http://localhost:3000
npm run build
npm run lint      # eslint
```

Both servers must run simultaneously for the app to work end-to-end. There is no test suite
(backend or frontend) and no CI configured yet.

## Architecture

**Backend is a single flat FastAPI app** — `backend/main.py` holds every route (no routers/blueprints),
grouped by comment banners (`# ---------- Users ----------`, `# ---------- Projects ----------`, etc.).
`models.py` (SQLAlchemy models + enums) and `schemas.py` (Pydantic request/response models, importing
the same enums from `models.py`) mirror each other 1:1 per entity. When adding a field, touch both files
plus the relevant route(s) in `main.py`.

Entity relationships: `User` owns `Project`s; a `Project` has `Position`s; a `Position` receives
`Application`s; an accepted `Application` creates a `TeamMember` row. Leaving a team
(`POST /team_members/{id}/leave`) sets `left_at` and flips the vacated `Position` back to `open`.

**Auth is JWT-based but not enforced.** `auth.py` provides `hash_password`/`verify_password` (bcrypt
via passlib) and `create_access_token`/`decode_access_token` (python-jose), and `POST /login` issues a
token. However, no route currently depends on `decode_access_token` to authenticate/authorize
requests — e.g. `create_project` takes `owner_id` as a plain query/body param and `update_user` doesn't
verify the caller owns `user_id`. Don't assume ownership is checked server-side; if you add
write endpoints, follow the existing pattern unless asked to add real auth enforcement.

`POST /login` takes `email`/`password` as query params, not a JSON body (see how `frontend/src/app/login/page.js`
calls it with `URLSearchParams`) — this is inconsistent with every other POST route, which takes a
JSON body via a Pydantic schema.

**Frontend has no shared API client.** Each page under `frontend/src/app/**/page.js` is a
`"use client"` component that calls `fetch("http://127.0.0.1:8000/...")` directly with the backend
URL hardcoded (no env var, no fetch wrapper). Auth state is just two localStorage keys —
`devgym_token` and `devgym_user_id` — read/written ad hoc per page (see `Navbar.js`, `login/page.js`).
`Navbar.js` determines logged-in state from `localStorage` in a `useEffect`, so a full navigation
(`window.location.href = ...`) is used after login/logout rather than router navigation, to force
the navbar to re-check.

Routing is Next.js App Router: one `page.js` per route under `src/app/`, dynamic route at
`src/app/projects/[id]/page.js`. Styling is Tailwind utility classes inline, dark-mode variants
included throughout (`dark:` classes), no separate CSS modules beyond `globals.css`.

**This frontend runs on a pre-release/atypical Next.js version** (16.x) — see `frontend/AGENTS.md`,
which instructs reading `node_modules/next/dist/docs/` before writing Next.js code since APIs may
differ from training data. Follow that instruction when touching frontend routing/data-fetching.
