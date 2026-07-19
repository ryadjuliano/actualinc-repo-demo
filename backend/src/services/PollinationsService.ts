import { env } from '../config/env';
import type { GeneratedImage } from '../types/generation';

const ENDPOINT = `${env.POLLINATIONS_BASE_URL}/v1/images/generations`;
const FREE_ENDPOINT = 'https://image.pollinations.ai/prompt';

interface PollinationsResponse {
  data?: Array<{ b64_json?: string }>;
}

const withAbortTimeout = async <T>(
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    return await fn(controller.signal);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Pollinations request timed out after ${env.AI_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Dev/testing only — image.pollinations.ai's free, unauthenticated legacy
 * endpoint (no Pollen balance needed, no API key). Returns the image bytes
 * directly (not JSON/base64), unlike the paid endpoint below.
 */
const generateImageFree = (finalPrompt: string): Promise<GeneratedImage> =>
  withAbortTimeout(async (signal) => {
    const url = `${FREE_ENDPOINT}/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&model=${encodeURIComponent(env.POLLINATIONS_MODEL)}&nologo=true`;
    const response = await fetch(url, { signal });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Pollinations free endpoint failed (${response.status}): ${body}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
    return { buffer, mimeType };
  });

/**
 * Calls pollinations.ai's OpenAI-compatible image generation endpoint and
 * returns the raw image bytes. Throws a plain Error (not AppError) on any
 * failure — ImageProviderService catches it to decide whether to fall back
 * to Gemini, so this never needs a user-facing message of its own.
 */
const generateImagePaid = (finalPrompt: string): Promise<GeneratedImage> =>
  withAbortTimeout(async (signal) => {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.POLLINATIONS_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        model: env.POLLINATIONS_MODEL,
        response_format: 'b64_json',
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Pollinations request failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as PollinationsResponse;
    const b64 = json.data?.[0]?.b64_json;

    if (!b64) {
      throw new Error('Pollinations response contained no image data');
    }

    return { buffer: Buffer.from(b64, 'base64'), mimeType: 'image/png' };
  });

export const generateImage = (finalPrompt: string): Promise<GeneratedImage> =>
  env.POLLINATIONS_FREE_MODE ? generateImageFree(finalPrompt) : generateImagePaid(finalPrompt);
