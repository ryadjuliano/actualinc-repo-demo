// Vercel serverless entrypoint. Vercel's Node.js runtime accepts an Express
// app directly as the default export (it matches the (req, res) handler
// signature it expects) — the app itself is unchanged from `src/app.ts`,
// only `server.ts`'s `app.listen()` is skipped in this environment since
// Vercel manages the actual HTTP listener.
import { app } from '../src/app';

export default app;
