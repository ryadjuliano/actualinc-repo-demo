import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { GeneratedImage } from '../types/generation';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// Rejects after AI_TIMEOUT_MS so a slow/stuck Gemini call never hangs a
// request indefinitely — matches the "AI Timeout" failure state in the spec.
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AppError('AI_TIMEOUT', 504)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Calls Gemini's native image generation and returns the raw image bytes.
 * Throws AppError('AI_TIMEOUT', 504) if the call exceeds AI_TIMEOUT_MS, and
 * AppError('AI_INVALID_RESPONSE', 502) if Gemini responds without image data.
 */
export const generateImage = async (finalPrompt: string): Promise<GeneratedImage> => {
  const response = await withTimeout(
    ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: finalPrompt,
      config: {
        responseModalities: ['Text', 'Image'],
      },
    }),
    env.AI_TIMEOUT_MS,
  );

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    logger.error('Gemini response contained no image data', { finalPrompt, parts });
    throw new AppError('AI_INVALID_RESPONSE', 502);
  }

  return {
    buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
    mimeType: imagePart.inlineData.mimeType ?? 'image/png',
  };
};
