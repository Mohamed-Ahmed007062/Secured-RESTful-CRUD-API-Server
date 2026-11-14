import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register.bind(authController)
);

router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  authController.login.bind(authController)
);

router.get(
  '/me',
  authenticate,
  authController.getMe.bind(authController)
);

export const authRouter = router;
