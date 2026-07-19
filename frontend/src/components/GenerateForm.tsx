'use client';

import { useEffect, useState } from 'react';
import { INTERIOR_STYLES, type InteriorStyle } from '@/types/generation';

interface GenerateFormProps {
  isSubmitting: boolean;
  initialPrompt?: string;
  initialStyle?: InteriorStyle;
  isEditing?: boolean;
  onSubmit: (values: { prompt: string; style: InteriorStyle }) => void;
  onCancelEdit?: () => void;
}

export function GenerateForm({
  isSubmitting,
  initialPrompt = '',
  initialStyle = 'Modern',
  isEditing = false,
  onSubmit,
  onCancelEdit,
}: GenerateFormProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [style, setStyle] = useState<InteriorStyle>(initialStyle);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Preload the prompt/style whenever the user picks a different card to
  // regenerate from, so editing an old idea always starts from that idea.
  useEffect(() => {
    setPrompt(initialPrompt);
    setStyle(initialStyle);
  }, [initialPrompt, initialStyle]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (prompt.trim().length < 5) {
      setValidationError('Please describe your interior idea.');
      return;
    }

    setValidationError(null);
    onSubmit({ prompt: prompt.trim(), style });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {isEditing && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-700">
          <span>Editing a saved idea — generating will save this as a new image.</span>
          <button type="button" onClick={onCancelEdit} className="font-medium underline">
            Cancel
          </button>
        </div>
      )}

      <label htmlFor="prompt" className="mb-2 block text-sm font-medium text-stone-700">
        Describe your space
      </label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. Small living room with natural lighting and indoor plants"
        rows={3}
        className="w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
      {validationError && <p className="mt-1 text-sm text-red-600">{validationError}</p>}

      <label htmlFor="style" className="mb-2 mt-4 block text-sm font-medium text-stone-700">
        Interior style
      </label>
      <div className="flex flex-wrap gap-2">
        {INTERIOR_STYLES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStyle(option)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              style === option
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-stone-300 text-stone-700 hover:border-brand-400'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Generating...' : isEditing ? 'Generate New Version' : 'Generate Interior Concept'}
      </button>
    </form>
  );
}
