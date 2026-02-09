import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth';
import * as authController from './auth.controller';
import { config } from '../../config/env';

const router = Router();

// Rate limiting for auth endpoints (5 requests per minute)
// Disabled in test environment to avoid flaky integration tests
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 5,
  message: {
    success: false,
    message: 'Too many attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);

export default router;
