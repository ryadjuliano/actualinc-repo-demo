# System Architecture

```mermaid
graph TD
    User[User's Browser]

    subgraph Frontend["Next.js Frontend (deployed separately)"]
        UI[App Router pages + Client Components]
    end

    subgraph Backend["Express API (deployed separately)"]
        Routes[Routes]
        Middlewares[Validation / Error / Logging Middlewares]
        Controllers[Controllers]
        Services["Services\n(GeminiService, StorageService, GenerationService)"]
    end

    Gemini["Gemini Image Generation API"]
    Storage["Supabase Storage\n(generated images)"]
    DB["Supabase PostgreSQL\n(generations table)"]

    User --> UI
    UI -->|"REST calls (JSON)"| Routes
    Routes --> Middlewares --> Controllers --> Services
    Services -->|"generate image"| Gemini
    Services -->|"upload image"| Storage
    Services -->|"read/write metadata"| DB
```

## Why this shape

- **Frontend never touches Gemini or Supabase directly.** The `GEMINI_API_KEY` and the Supabase
  `service_role` key both live only in the backend's process environment. The frontend only ever
  calls the backend's own REST API, so neither secret can leak into browser network traffic or
  client-side JS bundles.
- **Services own the business logic, controllers stay thin.** `GeminiService` only knows how to
  call Gemini. `StorageService` only knows how to upload to Supabase Storage. `GenerationService`
  orchestrates the two plus the database and is the only place that decides what counts as
  "completed" vs "failed". Controllers just parse the request, call a service, and return the
  result — this keeps the failure-handling logic in one place instead of duplicated per route.
- **One database table, no queue.** Given the scope (single synchronous generate call, no
  background workers), a `generations` table with a `status` column is enough to represent
  processing/completed/failed without introducing a job queue that this project doesn't need yet
  (see [`decisions.md`](./decisions.md) for the tradeoff this implies).
