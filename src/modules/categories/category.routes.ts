import { Router } from 'express';
import { categoryController } from './category.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  categoryQuerySchema,
} from './category.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

// Public / Authenticated read endpoints
router.get(
  '/',
  validate({ query: categoryQuerySchema }),
  categoryController.getAll.bind(categoryController)
);

router.get(
  '/:id',
  validate({ params: categoryIdParamSchema }),
  categoryController.getById.bind(categoryController)
);

// Secured mutation endpoints (ADMIN required)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate({ body: createCategorySchema }),
  categoryController.create.bind(categoryController)
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoryController.update.bind(categoryController)
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: categoryIdParamSchema }),
  categoryController.delete.bind(categoryController)
);

export const categoryRouter = router;
