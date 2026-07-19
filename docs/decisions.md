# Technical Decisions, Tradeoffs, and Known Limitations

## Technical Decisions

**Pollinations.ai as priority provider, Gemini as standby fallback.**
`ImageProviderService.generateImage()` is the only entry point `GenerationService` calls — it
tries pollinations.ai first (no billing requirement, generous free tier) and only calls Gemini if
Pollinations is unconfigured (no `POLLINATIONS_API_KEY`) or the call throws for any reason
(network error, timeout, non-2xx response, missing image data). Both providers return the same
`{ buffer, mimeType }` shape, so `GenerationService` and everything downstream (upload, DB
write, error mapping) is unaware of which provider actually produced the image. A Pollinations
failure is logged and swallowed at the `ImageProviderService` layer, not surfaced to the user —
only if Gemini *also* fails does the existing `AI_TIMEOUT`/`AI_INVALID_RESPONSE`/generic error
path kick in.

**Synchronous request/response instead of a job queue.**
`POST /api/generate` does the entire pipeline (validate → call Gemini → upload → save) inside a
single HTTP request and doesn't return until it's done. Given the scope of this project (no
requirement for a user to navigate away mid-generation, no need for retries/backoff beyond the
one Gemini call), this is simpler to build, simpler to reason about, and has no moving parts that
can get out of sync — at the cost of holding a request open for up to 45 seconds.

**UUID filenames, no shared temp files.**
Every uploaded image is named `${uuidv4()}.png` (or `.jpg`/`.webp` matching Gemini's actual mime
type). Nothing is ever written to a shared/local path — the image bytes go straight from Gemini's
response, through the Node process's memory, to Supabase Storage. This is what makes concurrent
requests from different users safe: there's no filename or file-handle two requests could
collide on.

**A `processing` row is written before calling Gemini, not after.**
This means a request that times out or crashes the process mid-flight still leaves a `failed` (or
even a stuck `processing`, if the process itself dies) row behind instead of silently disappearing
— the gallery reflects reality rather than only ever showing successes.

**Regeneration always inserts, never updates.**
`POST /api/generations/:id/regenerate` reads the original row for its prompt/style as defaults,
but the actual generation call creates a brand-new row via the exact same code path as
`POST /api/generate`. There's no special "update in place" logic to maintain, and no risk of a
regenerate accidentally destroying a previous image.

**Zod for validation, not a custom hand-rolled validator.**
The one validation rule that matters here (prompt length, valid style) is simple enough that a
custom validator would just be reinventing what `zod` already does well, with worse error
messages.

## Tradeoffs

- **Holding a synchronous connection open for up to 45s** is simple, but doesn't scale well to a
  large number of concurrent generations on a single small server instance — each in-flight
  request holds a connection/thread until Gemini responds. A production system serving significant
  traffic would move this to a queue (e.g. a `generations` row created immediately as `processing`,
  a background worker calls Gemini, and the frontend polls or subscribes for the status change).
  That's meaningfully more infrastructure than this project's scope calls for.
- **No authentication.** Every generation is visible to every visitor — there's no per-user
  ownership on the `generations` table. Adding real user accounts (Supabase Auth + a `user_id`
  column + RLS policies scoped to `auth.uid()`) would be the natural next step for a multi-tenant
  product, but wasn't in scope here.
- **No automatic cleanup of failed generations' partial state.** If the Gemini call fails, no
  image was ever uploaded, so there's no orphaned file to clean up. If the upload step itself were
  to fail after a successful Gemini call, the raw image bytes are simply discarded (not retried) —
  acceptable for this scope, but a production system might retry the upload before giving up.

## Known Limitations

- **Image generation quality depends heavily on prompt quality and cannot guarantee architectural
  accuracy.** Gemini is a general-purpose multimodal model, not a specialized architectural
  rendering engine — room proportions, lighting physics, and object placement are all
  best-effort, not guaranteed to be physically or spatially correct.
- **Gemini's image generation models are still labeled experimental/preview by Google** at the
  time of writing — availability, latency, and output quality can change without notice from
  Google's side, independent of anything in this codebase.
- **No rate limiting.** Nothing currently stops a single user from submitting many generations in
  quick succession, which could exhaust Gemini API quota or Supabase Storage quickly under abuse.
- **Gemini image generation models have a `0` free-tier quota on Google AI Studio.** The API key's
  Google Cloud project must have billing enabled before `GEMINI_MODEL` will actually return an
  image — without it, every request fails with a `RESOURCE_EXHAUSTED` quota error regardless of
  how correct the request itself is.
