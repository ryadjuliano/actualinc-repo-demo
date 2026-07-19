import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabaseClient';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Uploads a generated image to Supabase Storage under a UUID filename —
 * never a fixed name like "image.png", so concurrent requests from
 * different users can never collide or overwrite each other's files.
 * Returns the public URL to store on the generation record.
 */
export const uploadGeneratedImage = async (buffer: Buffer, mimeType: string): Promise<string> => {
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'png';
  const filename = `${uuidv4()}.${extension}`;

  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(filename, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    logger.error('Supabase Storage upload failed', { error: error.message, filename });
    throw new AppError('STORAGE_UPLOAD_FAILED', 502);
  }

  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
};
