import { listGenerations } from '@/lib/api';
import { StudioClient } from '@/components/StudioClient';

// Server Component: fetches the gallery fresh on every request/refresh, so
// the gallery "survives page refreshes" without any client-side caching.
export default async function HomePage() {
  const generations = await listGenerations().catch(() => []);

  return <StudioClient initialGenerations={generations} />;
}
