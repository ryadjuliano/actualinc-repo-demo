import Image from 'next/image';
import type { Generation } from '@/types/generation';

interface GenerationCardProps {
  generation: Generation;
  onSelect: (generation: Generation) => void;
  onZoom: (generation: Generation) => void;
}

// Explicit locale + timeZone (not `undefined`) so the string is identical
// whether it's rendered during SSR (server's locale/TZ) or during client
// hydration (browser's locale/TZ) — otherwise a mismatch throws React's
// hydration error #418.
const formatTimestamp = (isoString: string) =>
  new Date(isoString).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });

export function GenerationCard({ generation, onSelect, onZoom }: GenerationCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(generation)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-stone-100">
        {generation.status === 'completed' && generation.image_url && (
          <>
            <Image
              src={generation.image_url}
              alt={generation.prompt}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onZoom(generation);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  onZoom(generation);
                }
              }}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Zoom image"
            >
              🔍
            </span>
          </>
        )}
        {generation.status === 'processing' && (
          <div className="flex h-full w-full animate-pulse items-center justify-center text-sm text-stone-400">
            Generating...
          </div>
        )}
        {generation.status === 'failed' && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center text-sm text-red-500">
            <span>⚠</span>
            <span>Generation failed</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="w-fit rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
          {generation.style}
        </span>
        <p className="line-clamp-2 text-sm text-stone-700">{generation.prompt}</p>
        <p className="mt-auto text-xs text-stone-400">{formatTimestamp(generation.created_at)}</p>
      </div>
    </button>
  );
}
