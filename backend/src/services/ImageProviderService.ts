import { env } from '../config/env';
import { logger } from '../utils/logger';
import { generateImage as generateWithGemini } from './GeminiService';
import { generateImage as generateWithPollinations } from './PollinationsService';
import type { GeneratedImage } from '../types/generation';

/**
 * Pollinations.ai is the priority provider (tried first); Gemini is the
 * standby fallback used when Pollinations is unconfigured, errors, or times
 * out. GenerationService only ever calls this — it doesn't know or care
 * which underlying provider actually produced the image.
 */
export const generateImage = async (finalPrompt: string): Promise<GeneratedImage> => {
  if (env.POLLINATIONS_API_KEY) {
    try {
      return await generateWithPollinations(finalPrompt);
    } catch (err) {
      logger.error('Pollinations generation failed, falling back to Gemini', {
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  return generateWithGemini(finalPrompt);
};
