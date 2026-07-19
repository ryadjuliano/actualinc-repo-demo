import { z } from 'zod';
import { INTERIOR_STYLES } from '../types/generation';

// A blank or too-short prompt both fail this same rule, which is why they
// share the one message the spec asks for.
const promptSchema = z.string().trim().min(5, 'Please describe your interior idea.');

export const generateSchema = z.object({
  prompt: promptSchema,
  style: z.enum(INTERIOR_STYLES, {
    errorMap: () => ({ message: `Please select a valid interior style (${INTERIOR_STYLES.join(', ')}).` }),
  }),
});

export const regenerateSchema = z.object({
  prompt: promptSchema.optional(),
  style: z.enum(INTERIOR_STYLES).optional(),
});
