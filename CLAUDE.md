# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A personalized weekly workout plan generator that uses WHOOP recovery data to create adaptive training plans via the Claude API. React + TypeScript frontend with an Express backend.

## Commands

- `npm run dev` — Start both Vite dev server (port 5173) and Express API server (port 3001) concurrently
- `npm run dev:client` — Start only the Vite frontend
- `npm run dev:server` — Start only the Express backend (reads `.env` automatically)
- `npm run build` — TypeScript compile + Vite production build
- `npm run lint` — ESLint across the project

No test framework is configured.

## Environment Variables

Copy `.env.example` to `.env`. Required keys: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `ANTHROPIC_API_KEY`.

## Architecture

### Frontend (React + Vite + Tailwind v4)

- **Routing:** React Router v7 with URL-based navigation — `/:weekDate` selects a week, `/:weekDate/:day` selects a day
- **State:** No global store; `AuthContext` manages WHOOP OAuth status, custom hooks manage data fetching
- **Plan rendering:** Workout plans are stored as markdown files in `public/plans/`. The `markdownParser.ts` utility splits them into structured `WeekPlan` objects (overview, per-day content, notes) by parsing `#`/`##` headings. Rendered with `react-markdown` + `remark-gfm`.
- **Key hooks:** `usePlans` (loads plan list + parses markdown), `useWhoopData` (fetches recovery/cycle/sleep), `useGeneratePlan` (triggers server-side plan generation)

### Backend (`server/index.ts` — single file Express server on port 3001)

- **WHOOP OAuth:** Full OAuth2 flow with token refresh. Tokens persisted to `server/.tokens.json`.
- **WHOOP API proxy:** `/api/whoop/*` endpoints proxy to WHOOP Developer API v1 (recovery, cycles, sleep)
- **Plan generation:** `POST /api/generate-plan` fetches prior week's WHOOP data, builds a detailed prompt with training preferences and recovery-based intensity rules, calls Claude API, saves the resulting markdown to `public/plans/workout-plan-{date}.md`, and updates `PLAN_MANIFEST` in `src/config/training.ts`
- Vite proxies `/api` requests to the backend in dev mode

### Plan Manifest

`src/config/training.ts` contains `PLAN_MANIFEST` — a static array of plan filenames used as a fallback when the API server is unavailable. The server auto-appends new entries when generating plans.

### Key Domain Concepts

- **Recovery zones:** Green (67-100%), Yellow (34-66%), Red (0-33%) — mapped from WHOOP recovery scores to training intensity
- **Training split:** A/B/C days (Chest+Back / Legs / Arms), Tuesday is always soccer, plans include 1 rest day and 1 mobility day
- Plans are generated for the upcoming week based on the previous week's WHOOP metrics
