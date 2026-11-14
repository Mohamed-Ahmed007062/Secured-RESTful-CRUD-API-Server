import { Router } from 'express';
import { userController } from './user.controller.js';
import { validate } from '../../middleware/validate.js';
import { userIdParamSchema, updateUserSchema, userQuerySchema } from './user.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

// Protected: Only Admin can list all users
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate({ query: userQuerySchema }),
  userController.getAll.bind(userController)
);

// Protected: Authenticated users can view profile by ID
router.get(
  '/:id',
  authenticate,
  validate({ params: userIdParamSchema }),
  userController.getById.bind(userController)
);

// Protected: Self or Admin can update user
router.patch(
  '/:id',
  authenticate,
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  userController.update.bind(userController)
);

export const userRouter = router;
