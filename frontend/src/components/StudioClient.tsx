'use client';

import { useState } from 'react';
import type { Generation, InteriorStyle } from '@/types/generation';
import { ApiError, generateImage, listGenerations, regenerateGeneration } from '@/lib/api';
import { GenerateForm } from './GenerateForm';
import { GeneratingBanner } from './GeneratingBanner';
import { Gallery } from './Gallery';
import { ImageZoomModal } from './ImageZoomModal';

interface StudioClientProps {
  initialGenerations: Generation[];
}

export function StudioClient({ initialGenerations }: StudioClientProps) {
  const [generations, setGenerations] = useState(initialGenerations);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingFrom, setEditingFrom] = useState<Generation | null>(null);
  const [zoomingGeneration, setZoomingGeneration] = useState<Generation | null>(null);

  const refreshGallery = async () => {
    try {
      setGenerations(await listGenerations());
    } catch {
      // Keep showing the last known-good list rather than clearing it.
    }
  };

  const handleSubmit = async ({ prompt, style }: { prompt: string; style: InteriorStyle }) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = editingFrom
        ? await regenerateGeneration(editingFrom.id, { prompt, style })
        : await generateImage(prompt, style);

      setGenerations((prev) => [result, ...prev]);
      setEditingFrom(null);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      // The backend still persists a "failed" record even when the request
      // itself errors, so refresh to surface it in the gallery.
      await refreshGallery();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Interior Design AI Studio</h1>
        <p className="mt-1 text-stone-500">
          Describe a space, pick a style, and generate a photorealistic interior design concept.
        </p>
      </header>

      <div className="mb-8">
        <GenerateForm
          isSubmitting={isSubmitting}
          initialPrompt={editingFrom?.prompt}
          initialStyle={editingFrom?.style}
          isEditing={Boolean(editingFrom)}
          onSubmit={handleSubmit}
          onCancelEdit={() => setEditingFrom(null)}
        />
      </div>

      {isSubmitting && (
        <div className="mb-8">
          <GeneratingBanner />
        </div>
      )}

      {errorMessage && !isSubmitting && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-medium text-stone-900">Your Gallery</h2>
        <Gallery generations={generations} onSelect={setEditingFrom} onZoom={setZoomingGeneration} />
      </section>

      {zoomingGeneration && (
        <ImageZoomModal generation={zoomingGeneration} onClose={() => setZoomingGeneration(null)} />
      )}
    </main>
  );
}
