# Submission — Interior Design AI Studio

**Candidate:** Ryad Juliano
**Repo:** https://github.com/ryadjuliano/actualinc-repo-demo
**Live URL:** _TODO — paste your deployed URL here once the app is deployed (see "What's Left" below)_
**Demo recording:** _TODO — paste your Loom link here once recorded (see "What's Left" below)_

---

## 1. Your Thinking

### 1.1 The niche

The app is scoped to one niche only: **interior design concept generation**. Every layer of the
stack reflects that choice rather than treating it as a label — the prompt-building function wraps
every user input in `"A photorealistic {style} style interior design of {prompt}."`
(`backend/src/services/GenerationService.ts`), the five selectable styles (Modern, Scandinavian,
Industrial, Japandi, Luxury) are interior-design sub-styles rather than generic tags, and the UI
copy ("Describe your interior idea", "Generate Interior Concept") is written for someone furnishing
a room, not a generic "type anything" tool.

### 1.2 Request journey

A prompt's full round trip for `POST /api/generate`:

1. User types a prompt and picks a style in the frontend (`GenerateForm.tsx`).
2. The frontend calls the backend directly: `POST /api/generate { prompt, style }`
   (`frontend/src/lib/api.ts`) — this is the **only** way the frontend ever talks to anything;
   it holds no AI provider keys and never calls Gemini/Pollinations itself.
3. The backend validates the payload with Zod (`backend/src/middlewares/schemas.ts`). Invalid
   input (empty/too-short prompt) returns `400` immediately, before any AI call is made.
4. `GenerationService.createGeneration` (`backend/src/services/GenerationService.ts`) inserts a
   `generations` row with `status = 'processing'` **before** calling the AI provider, so a crash or
   timeout still leaves a real row behind instead of silently losing the attempt.
5. `ImageProviderService` tries **Pollinations.ai first** (no billing requirement), and only falls
   back to **Gemini** if Pollinations is unconfigured or the call fails for any reason. Both
   providers return the same `{ buffer, mimeType }` shape, so nothing downstream needs to know
   which one actually produced the image.
6. On success, `StorageService` uploads the raw bytes to Supabase Storage under a UUID filename
   and returns a public URL. The `generations` row is updated to `status = 'completed'` with that
   URL. On failure (timeout, malformed AI response, upload failure), the row is updated to
   `status = 'failed'` with a specific `error_message`.
7. The backend responds; the frontend either prepends the new card to the gallery or shows the
   error message returned by the backend.

The full sequence — including both AI failure branches with their exact HTTP status codes and
user-facing messages — is diagrammed in [`docs/request-journey.md`](./docs/request-journey.md).
`docs/architecture.md` covers the system shape end-to-end and `docs/database-schema.md` covers the
single `generations` table this all writes to.

### 1.3 Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| Backend | Express + TypeScript | Small, well-understood surface for a handful of REST routes; TypeScript gives the service layer (Gemini response shapes, DB rows, error codes) real type safety without the overhead of a bigger framework this project doesn't need. |
| Frontend | Next.js (App Router) + React | Server Components let the gallery page fetch directly from the backend on every load (`cache: 'no-store'`) with no separate client-side data-fetching library — a page refresh is a real server round trip, which is exactly what "the gallery must persist across refresh" requires. |
| Database + Storage | Supabase (Postgres + Storage) | One provider for both structured data (the `generations` table) and file storage (generated images), with a public-read bucket and `service_role`-only writes — no separate object storage service to configure. |
| Validation | Zod | The only validation rule that matters here (prompt length, valid style enum) is simple; Zod gives typed, composable validation with good error messages for near-zero code. |
| AI providers | Pollinations.ai (primary) + Gemini (fallback) | Pollinations has no billing requirement, so development and demoing don't depend on Google Cloud billing being enabled. Gemini is kept as a real fallback so a Pollinations outage doesn't take down generation entirely — this also happens to demonstrate handling more than one upstream failure mode, which the assignment explicitly wants understood. |

### 1.4 Build process — what came first, and why

The repo's commit history is grouped by architectural layer, in the order the pipeline actually
needs to exist for anything downstream to work:

1. **Scaffolding** (both apps' tooling/config) — nothing else can be built without this.
2. **Database schema** — the `generations` table and storage bucket, since every backend service
   depends on knowing this shape.
3. **Backend foundations** — env config, error types, validation, before any business logic, so
   every later service has a consistent way to fail loudly and predictably.
4. **AI provider services** — Gemini + Pollinations, built and tested against the real APIs in
   isolation before anything tried to orchestrate them.
5. **Generation + storage services** — the actual create/regenerate pipeline, once the pieces it
   orchestrates already existed and were trustworthy on their own.
6. **Routes/controller/server** — the thinnest layer, wired last since it has nothing to do except
   call the services above.
7. **Frontend scaffold → components → wiring** — same bottom-up order: shared types and the API
   client first, then presentational components (gallery, form, loading banner), then the stateful
   client component that ties generate/regenerate/error handling together.
8. **Docs and README** — written to describe the system that now existed, and to make the
   "why" behind non-obvious choices (like the Pollinations/Gemini fallback, or always-insert
   regeneration) explicit rather than left implicit in code.

This ordering prioritizes **having something end-to-end and testable as early as possible**
(schema → one working AI call → one working upload) over building all of the backend before
touching the frontend, or vice versa — at every stage there was a runnable slice of the real
pipeline, not a large batch of untested code.

---

## 2. Your Decisions

The full reasoning for each of these lives in [`docs/decisions.md`](./docs/decisions.md); summarized:

- **Pollinations first, Gemini as fallback** — avoids the entire flow depending on one provider's
  uptime or billing status, and demonstrates handling more than one class of upstream failure.
- **Synchronous request/response, no job queue** — simpler and has no moving parts to get out of
  sync, at the cost of holding an HTTP connection open for up to 45 seconds per generation. Flagged
  explicitly as the tradeoff I'd revisit first if this needed to scale.
- **UUID filenames for every upload, never a shared path** — this is what makes concurrent
  generations from different users safe: two requests can never collide on a filename or file
  handle.
- **Insert a `processing` row before calling the AI provider, not after** — a crash or timeout mid-
  request still leaves a real (`failed`, or `processing`) row behind; nothing silently disappears
  from the gallery.
- **Regeneration always inserts a new row, never updates the source row** — no "update in place"
  logic to get wrong, and no way for a regenerate to destroy a previous result.
- **No authentication, single global gallery** — an explicit scope cut, not an oversight. Written
  down in `docs/decisions.md` rather than discovered by a reviewer. The natural next step would be
  Supabase Auth + a `user_id` column + RLS scoped to `auth.uid()`.

### What still doesn't work well (the honest part)

- **The frontend shows one generic error box for both AI-timeout and broken-response failures.**
  The backend distinguishes all three required failure states with different messages and status
  codes, but the frontend currently renders AI-timeout and invalid-response in the same plain red
  alert styling — only the invalid-prompt case (caught client-side, before any request) gets a
  visually distinct treatment. If I had more time, this is the first thing I'd fix: give each
  failure code its own icon/copy in the UI instead of relying on the message text alone to
  differentiate them.
- **No rate limiting.** A single user could submit generations back-to-back and exhaust the shared
  Pollinations/Gemini quota for every other visitor, since there's no per-user or per-IP throttling.
- **No per-user ownership.** Every visitor shares one global gallery — there's no login, so there's
  also no way to show "your generations" versus everyone else's.

---

## 3. Demo Recording

_TODO: record and link a Loom (or equivalent) showing:_
- _A real prompt submitted, the ~10-30s wait shown (not skipped), the resulting image saved to the gallery_
- _Clicking a saved gallery card, tweaking its prompt, and regenerating without starting over_
- _At least two of the three failure states, shown live (e.g. submit an empty/too-short prompt for
  the validation error; temporarily set `AI_TIMEOUT_MS` very low, or turn off Wi-Fi to Gemini/
  Pollinations mid-request, to force a real timeout)_

## 4. Live URL

_TODO: deploy the backend (e.g. Render/Railway/Fly.io) and frontend (e.g. Vercel), point
`NEXT_PUBLIC_API_URL` at the deployed backend, and paste the working frontend URL here._
