import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import * as GenerationService from '../services/GenerationService';

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const { prompt, style } = req.body;
  const generation = await GenerationService.createGeneration(prompt, style);
  res.status(201).json(generation);
});

export const listGenerations = asyncHandler(async (_req: Request, res: Response) => {
  const generations = await GenerationService.listGenerations();
  res.json(generations);
});

export const getGeneration = asyncHandler(async (req: Request, res: Response) => {
  const generation = await GenerationService.getGenerationById(req.params.id);
  if (!generation) {
    throw new AppError('Generation not found', 404);
  }
  res.json(generation);
});

export const regenerate = asyncHandler(async (req: Request, res: Response) => {
  const { prompt, style } = req.body;
  const generation = await GenerationService.regenerateGeneration(req.params.id, { prompt, style });
  res.status(201).json(generation);
});
