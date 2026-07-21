import type { Generation } from '@/types/generation';
import { GenerationCard } from './GenerationCard';

interface GalleryProps {
  generations: Generation[];
  onSelect: (generation: Generation) => void;
  onZoom: (generation: Generation) => void;
}

export function Gallery({ generations, onSelect, onZoom }: GalleryProps) {
  if (generations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-400">
        Your generated interior concepts will appear here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {generations.map((generation) => (
        <GenerationCard key={generation.id} generation={generation} onSelect={onSelect} onZoom={onZoom} />
      ))}
    </div>
  );
}
