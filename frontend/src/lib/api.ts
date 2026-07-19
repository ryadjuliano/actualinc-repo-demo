import type { Generation, InteriorStyle } from '@/types/generation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.message ?? 'Something went wrong. Please try again.', response.status);
  }

  return response.json() as Promise<T>;
}

export const generateImage = (prompt: string, style: InteriorStyle) =>
  request<Generation>('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, style }),
  });

export const listGenerations = () => request<Generation[]>('/api/generations', { cache: 'no-store' });

export const getGeneration = (id: string) => request<Generation>(`/api/generations/${id}`, { cache: 'no-store' });

export const regenerateGeneration = (id: string, overrides: { prompt?: string; style?: InteriorStyle }) =>
  request<Generation>(`/api/generations/${id}/regenerate`, {
    method: 'POST',
    body: JSON.stringify(overrides),
  });
