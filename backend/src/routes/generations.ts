import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { generateSchema, regenerateSchema } from '../middlewares/schemas';
import * as controller from '../controllers/generationController';

const router = Router();

router.post('/generate', validate(generateSchema), controller.generate);
router.get('/generations', controller.listGenerations);
router.get('/generations/:id', controller.getGeneration);
router.post('/generations/:id/regenerate', validate(regenerateSchema), controller.regenerate);

export default router;
