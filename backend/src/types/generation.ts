export const INTERIOR_STYLES = ['Modern', 'Scandinavian', 'Industrial', 'Japandi', 'Luxury'] as const;

export type InteriorStyle = (typeof INTERIOR_STYLES)[number];

export type GenerationStatus = 'processing' | 'completed' | 'failed';

export interface Generation {
  id: string;
  prompt: string;
  style: InteriorStyle;
  final_prompt: string;
  image_url: string | null;
  status: GenerationStatus;
  error_message: string | null;
  created_at: string;
}

export interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
}
