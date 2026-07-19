# Interior Design AI Studio

Generate interior design concepts from a text prompt + style selection, save every result to a
personal gallery that survives page refreshes, and refine any past idea into a new generation.

This is a two-service project: a Next.js frontend and an Express backend, backed by Supabase
(PostgreSQL + Storage) and two image generation providers — pollinations.ai (priority) with
Google's Gemini as a standby fallback.

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Database Setup](#database-setup)
- [Running the Backend](#running-the-backend)
- [Running the Frontend](#running-the-frontend)
- [Deployment](#deployment)
- [Further Documentation](#further-documentation)

## Architecture

```
Browser → Next.js (frontend) → Express API (backend) → Pollinations.ai (priority)
                                                       → Gemini API (standby fallback)
                                                       → Supabase Storage
                                                       → Supabase PostgreSQL
```

The frontend never talks to Pollinations, Gemini, or Supabase directly — every AI call and every
piece of storage/database access happens inside the backend, so the provider API keys and the
Supabase service-role key are never exposed to the browser. `ImageProviderService` tries
Pollinations first and only calls Gemini if Pollinations is unconfigured or fails.

See [`docs/architecture.md`](docs/architecture.md) for the full diagram and explanation, and
[`docs/request-journey.md`](docs/request-journey.md) for exactly what happens for a single
"Generate" request, step by step.

## Project Structure

```
actualinc/
├── backend/            Express + TypeScript API
│   └── src/
│       ├── config/       env validation, Supabase client
│       ├── controllers/  thin HTTP handlers (no business logic)
│       ├── middlewares/  validation, error handling, logging
│       ├── routes/       route definitions
│       ├── services/     ImageProviderService (Pollinations→Gemini fallback), GeminiService,
│       │                 PollinationsService, StorageService, GenerationService
│       ├── types/        shared TypeScript types
│       ├── utils/        AppError, asyncHandler, logger
│       ├── app.ts        Express app wiring
│       └── server.ts     entry point
├── frontend/            Next.js App Router + TypeScript + Tailwind
│   └── src/
│       ├── app/           routes, layout, global styles
│       ├── components/    GenerateForm, Gallery, GenerationCard, StudioClient
│       ├── lib/           typed API client
│       └── types/         shared TypeScript types
├── supabase/
│   └── migrations/       SQL for the `generations` table + storage bucket
└── docs/                  architecture, request journey, DB schema, decisions
```

## Environment Variables

### Backend (`backend/.env`, copy from `backend/.env.example`)

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `4000`) |
| `CORS_ORIGIN` | Frontend origin allowed to call this API (e.g. `http://localhost:3000`) |
| `GEMINI_API_KEY` | API key from [Google AI Studio](https://aistudio.google.com/app/apikey) — standby fallback provider |
| `GEMINI_MODEL` | Gemini model used for image generation (default `gemini-2.5-flash-image`) — requires a billing-enabled Google AI Studio/Cloud project; it is not available on the free tier |
| `AI_TIMEOUT_MS` | Milliseconds before an image generation call (either provider) is aborted as timed out (default `45000`) |
| `POLLINATIONS_API_KEY` | API key from [pollinations.ai](https://gen.pollinations.ai/docs) — priority image provider, tried first on every generation. Leave blank to run Gemini-only |
| `POLLINATIONS_MODEL` | Pollinations model used for image generation (default `flux`) |
| `POLLINATIONS_BASE_URL` | Pollinations API base URL (default `https://gen.pollinations.ai`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service role** key (Project Settings → API) — server-only, bypasses RLS |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name for generated images (default `generations`) |

### Frontend (`frontend/.env.local`, copy from `frontend/.env.local.example`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (e.g. `http://localhost:4000`) |

## Local Setup

Requires Node.js 20+.

```bash
# 1. Backend
cd backend
cp .env.example .env      # then fill in the real values
npm install

# 2. Frontend
cd ../frontend
cp .env.local.example .env.local
npm install
```

## Database Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run, in order:
   - [`supabase/migrations/001_create_generations_table.sql`](supabase/migrations/001_create_generations_table.sql)
   - [`supabase/migrations/002_create_storage_bucket.sql`](supabase/migrations/002_create_storage_bucket.sql)
3. Copy your project's URL and **service role key** (Project Settings → API) into `backend/.env`.

See [`docs/database-schema.md`](docs/database-schema.md) for the full schema diagram.

## Running the Backend

```bash
cd backend
npm run dev
```

Starts on `http://localhost:4000`. Health check: `GET /health`.

## Running the Frontend

```bash
cd frontend
npm run dev
```

Starts on `http://localhost:3000`. Make sure the backend is already running and
`NEXT_PUBLIC_API_URL` points at it.

## Deployment

Frontend and backend are deployed **separately**.

**Backend** (e.g. Render, Railway, Fly.io):
1. Deploy the `backend/` directory as a Node service.
2. Build command: `npm install && npm run build`. Start command: `npm start`.
3. Set all backend environment variables from the table above in the host's dashboard.
4. Set `CORS_ORIGIN` to your deployed frontend's URL.

**Frontend** (e.g. Vercel):
1. Deploy the `frontend/` directory as a Next.js app.
2. Set `NEXT_PUBLIC_API_URL` to your deployed backend's URL.

## Further Documentation

- [`docs/architecture.md`](docs/architecture.md) — system architecture diagram + explanation
- [`docs/request-journey.md`](docs/request-journey.md) — step-by-step request flow for a generation
- [`docs/database-schema.md`](docs/database-schema.md) — database schema diagram
- [`docs/decisions.md`](docs/decisions.md) — technical decisions, tradeoffs, and known limitations
