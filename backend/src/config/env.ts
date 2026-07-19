import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Fails fast at startup with a clear message instead of surfacing confusing
// runtime errors deep inside a service the first time a route is hit.
const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  // Comma-separated so local dev survives Next.js falling back to 3001+ when
  // 3000 is already taken — e.g. "http://localhost:3000,http://localhost:3001".
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((value) => value.split(',').map((origin) => origin.trim())),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash-image'),
  AI_TIMEOUT_MS: z.coerce.number().default(45000),

  // Pollinations.ai is the primary image provider; Gemini above is the
  // standby fallback. Left optional (empty string) so the app can still run
  // Gemini-only if no key is configured.
  POLLINATIONS_API_KEY: z.string().optional().default(''),
  POLLINATIONS_MODEL: z.string().default('flux'),
  POLLINATIONS_BASE_URL: z.string().url().default('https://gen.pollinations.ai'),
  // Dev/testing only: uses image.pollinations.ai's free, unauthenticated
  // legacy endpoint instead of the paid gen.pollinations.ai API — no Pollen
  // balance needed. Never enable this in production (no auth, no SLA).
  POLLINATIONS_FREE_MODE: z
    .string()
    .optional()
    .default('false')
    .transform((value) => value === 'true'),

  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_STORAGE_BUCKET: z.string().default('generations'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
