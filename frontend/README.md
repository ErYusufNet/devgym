# DevGym

Build real experience on real teams.

DevGym helps unemployed and early-career developers gain real team
experience by collaborating on non-commercial software projects.
Publish a project, build a team, ship it together on GitHub.

## Status

Early MVP, under active development.

## Tech stack

**Backend**
- FastAPI (Python)
- SQLAlchemy + SQLite (dev database)
- JWT auth with bcrypt password hashing

**Frontend**
- Next.js (App Router)
- React
- TailwindCSS

## Features so far

- User registration and login (JWT-based)
- Project creation with tech stack, type, duration, weekly hours, timezone
- Open positions per project
- Applications to positions
- Team membership, with automatic position reopening when a member leaves
  (the "handoff" mechanic — the core idea behind DevGym)
- Landing page, register/login pages, and a project discovery feed

## Project structure

devgym/
├── backend/
│ ├── main.py # API routes
│ ├── models.py # SQLAlchemy models
│ ├── schemas.py # Pydantic request/response schemas
│ ├── database.py # DB connection setup
│ ├── auth.py # Password hashing + JWT
│ └── requirements.txt
├── frontend/
│ └── src/app/
│ ├── page.js # Landing page
│ ├── login/page.js
│ ├── register/page.js
│ └── discover/page.js # Project feed


## Running locally

**Backend**
```bash
cd backend
venv\Scripts\Activate.ps1
uvicorn main:app --reload
```
Runs on http://127.0.0.1:8000 — interactive API docs at `/docs`.

**Frontend**
```bash
cd frontend
npm run dev
```
Runs on http://localhost:3000

Both servers need to be running at the same time for the app to work.

## Roadmap

- [ ] Project detail page (positions, apply button)
- [ ] User profile page
- [ ] Basic skill-based matching / filtering
- [ ] Project creation form (currently API-only)
- [ ] Deployment