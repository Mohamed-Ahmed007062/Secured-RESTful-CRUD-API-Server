import { Router } from 'express';
import { productController } from './product.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productQuerySchema,
} from './product.schema.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public / Authenticated read endpoints
router.get(
  '/',
  validate({ query: productQuerySchema }),
  productController.getAll.bind(productController)
);

router.get(
  '/:id',
  validate({ params: productIdParamSchema }),
  productController.getById.bind(productController)
);

// Secured mutation endpoints (Authentication required + Ownership or ADMIN check)
router.post(
  '/',
  authenticate,
  validate({ body: createProductSchema }),
  productController.create.bind(productController)
);

router.put(
  '/:id',
  authenticate,
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productController.update.bind(productController)
);

router.patch(
  '/:id',
  authenticate,
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productController.update.bind(productController)
);

router.delete(
  '/:id',
  authenticate,
  validate({ params: productIdParamSchema }),
  productController.delete.bind(productController)
);

export const productRouter = router;
