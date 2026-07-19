import { supabase } from '../config/supabaseClient';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { generateImage } from './ImageProviderService';
import { uploadGeneratedImage } from './StorageService';
import type { Generation, InteriorStyle } from '../types/generation';

const TABLE = 'generations';

// User-facing messages for the failure modes called out in the spec — kept
// here (not in GeminiService/StorageService) since the service layer owns
// what the API actually promises to the frontend.
const ERROR_MESSAGES: Record<string, string> = {
  AI_TIMEOUT: 'The AI service is taking longer than expected. Please try again.',
  AI_INVALID_RESPONSE: 'The AI service returned an invalid response. Please try again.',
  STORAGE_UPLOAD_FAILED: 'We generated your image but could not save it. Please try again.',
};

const buildFinalPrompt = (style: InteriorStyle, prompt: string): string => {
  const cleanPrompt = prompt.trim().replace(/\.+$/, '');
  return `A photorealistic ${style} style interior design of ${cleanPrompt}.`;
};

const DATABASE_ERROR_MESSAGE = 'We could not reach the database. Please try again in a moment.';

const mapDbError = (context: string, error: unknown): never => {
  logger.error(context, { error: error instanceof Error ? error.message : error });
  throw new AppError(DATABASE_ERROR_MESSAGE, 500);
};

export const listGenerations = async (): Promise<Generation[]> => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return mapDbError('Failed to list generations', error);
  return data as Generation[];
};

export const getGenerationById = async (id: string): Promise<Generation | null> => {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();

  if (error) return mapDbError('Failed to fetch generation', error);
  return data as Generation | null;
};

/**
 * Full create-generation pipeline: insert a "processing" row, call Gemini,
 * upload the result, then mark the row "completed" (with image_url) or
 * "failed" (with error_message) — never overwrites an existing row from a
 * different call, since each invocation inserts a brand-new record.
 */
export const createGeneration = async (prompt: string, style: InteriorStyle): Promise<Generation> => {
  const finalPrompt = buildFinalPrompt(style, prompt);

  const { data: inserted, error: insertError } = await supabase
    .from(TABLE)
    .insert({ prompt, style, final_prompt: finalPrompt, status: 'processing' })
    .select()
    .single();

  if (insertError) return mapDbError('Failed to create generation record', insertError);

  const generation = inserted as Generation;

  try {
    const { buffer, mimeType } = await generateImage(finalPrompt);
    const imageUrl = await uploadGeneratedImage(buffer, mimeType);

    const { data: updated, error: updateError } = await supabase
      .from(TABLE)
      .update({ status: 'completed', image_url: imageUrl })
      .eq('id', generation.id)
      .select()
      .single();

    if (updateError) return mapDbError('Failed to save completed generation', updateError);
    return updated as Generation;
  } catch (err) {
    const code = err instanceof AppError ? err.message : 'UNKNOWN_ERROR';
    const userMessage = ERROR_MESSAGES[code] ?? 'Something went wrong while generating your image.';

    await supabase.from(TABLE).update({ status: 'failed', error_message: userMessage }).eq('id', generation.id);

    logger.error('Generation failed', {
      id: generation.id,
      code,
      // Full underlying error for non-AppError cases (e.g. a raw Gemini SDK
      // error) — otherwise the real cause is invisible behind the generic message.
      rawError: err instanceof AppError ? undefined : err instanceof Error ? err.message : err,
    });

    if (err instanceof AppError) {
      // Re-throw with the user-facing message so the controller returns it as-is.
      throw new AppError(userMessage, err.statusCode);
    }
    throw new AppError(userMessage, 500);
  }
};

/**
 * Regenerates from an existing record: inherits its prompt/style unless the
 * caller supplies overrides, then runs the exact same creation pipeline as
 * a brand-new record — the original row is never touched.
 */
export const regenerateGeneration = async (
  id: string,
  overrides: { prompt?: string; style?: InteriorStyle },
): Promise<Generation> => {
  const original = await getGenerationById(id);
  if (!original) {
    throw new AppError('Generation not found', 404);
  }

  const prompt = overrides.prompt?.trim() || original.prompt;
  const style = overrides.style || original.style;

  return createGeneration(prompt, style);
};
