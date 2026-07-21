'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Generation } from '@/types/generation';

interface ImageZoomModalProps {
  generation: Generation;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.5;

export function ImageZoomModal({ generation, onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(MIN_SCALE);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const zoomIn = () => setScale((s) => clampScale(s + SCALE_STEP));
  const zoomOut = () =>
    setScale((s) => {
      const next = clampScale(s - SCALE_STEP);
      if (next === MIN_SCALE) setPan({ x: 0, y: 0 });
      return next;
    });
  const resetZoom = () => {
    setScale(MIN_SCALE);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const next = clampScale(s + (e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP));
      if (next === MIN_SCALE) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale === MIN_SCALE) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const { startX, startY, panX, panY } = dragState.current;
    setPan({ x: panX + (e.clientX - startX), y: panY + (e.clientY - startY) });
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            zoomOut();
          }}
          disabled={scale === MIN_SCALE}
          className="rounded-full bg-white/10 px-3 py-2 text-lg text-white hover:bg-white/20 disabled:opacity-30"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
          }}
          className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            zoomIn();
          }}
          disabled={scale === MAX_SCALE}
          className="rounded-full bg-white/10 px-3 py-2 text-lg text-white hover:bg-white/20 disabled:opacity-30"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-2 rounded-full bg-white/10 px-3 py-2 text-lg text-white hover:bg-white/20"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div
        className="relative h-full max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: scale > MIN_SCALE ? 'grab' : 'default' }}
      >
        {generation.image_url && (
          <div
            className="relative h-full w-full transition-transform"
            style={{
              transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
            }}
          >
            <Image
              src={generation.image_url}
              alt={generation.prompt}
              fill
              sizes="90vw"
              className="object-contain"
              draggable={false}
            />
          </div>
        )}
      </div>

      <p className="absolute bottom-4 left-1/2 max-w-lg -translate-x-1/2 px-4 text-center text-sm text-white/70">
        {generation.prompt}
      </p>
    </div>
  );
}
