import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Service-role client — server-only. This key bypasses Row Level Security,
// which is why every Supabase call in this codebase must live in the
// backend and never be sent to the browser.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
