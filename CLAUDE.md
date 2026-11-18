# CLAUDE.md

@AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Compliance Agent is an AI-powered compliance platform for automated document review, regulatory monitoring, and audit reporting. Built for the **AI Agents for Compliance** startup.

## Tech Stack

- **Backend:** Python 3.11+ / FastAPI / SQLAlchemy (async) / PostgreSQL via Supabase
- **Frontend:** Next.js 14 (App Router) / TypeScript / Tailwind CSS
- **Auth:** Supabase Auth
- **AI:** Anthropic Claude (`claude-opus-4-6`) via `app/services/llm.py`
- **Package Management:** Poetry (backend), npm (frontend)
- **Deploy:** Railway (backend), Vercel (frontend)

## Development Commands

### Full stack (Docker)
```bash
docker-compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:8001
```

### Backend
```bash
cd backend
cp .env.example .env   # fill in secrets
poetry install
poetry run uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
cp .env.example .env.local   # fill in secrets
npm install
npm run dev
```

### Lint & test
```bash
cd backend && poetry run ruff check . && poetry run pytest
cd frontend && npm run lint && npm run build
```

## Architecture

```
Frontend (Next.js :3000)  →  Backend (FastAPI :8001)  →  PostgreSQL (:5432)
                                                      →  Supabase Auth
                                                      →  Anthropic API
```

### Backend (`backend/app/`)
- `api/` — REST endpoints: `auth`, `documents`, `regulations`, `reports`
- `agents/` — AI agent logic: `document_reviewer`, `regulation_monitor`, `report_generator`
- `services/llm.py` — Anthropic Claude wrapper (`complete(system, prompt)`)
- `services/pdf.py` — PDF text extraction
- `models/` — SQLAlchemy ORM models
- `schemas/` — Pydantic request/response schemas
- `config.py` — Settings via `pydantic-settings` (reads `.env`)
- `main.py` — FastAPI app + CORS + router registration

### Frontend (`frontend/`)
- `app/` — Next.js App Router pages
- `lib/api.ts` — API client
- Env vars prefixed with `NEXT_PUBLIC_`

## Core Features

| Feature | Agent | API prefix |
|---------|-------|------------|
| Document review | `document_reviewer.py` | `/api/documents` |
| Regulation monitoring | `regulation_monitor.py` | `/api/regulations` |
| Audit & reporting | `report_generator.py` | `/api/reports` |

## Deployment

- **Railway:** reads `railway.toml`, deploys backend Dockerfile, injects env vars via Railway dashboard
- **Vercel:** connect `frontend/` directory, set `NEXT_PUBLIC_*` env vars in Vercel dashboard
