const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const { loginRateLimiter } = require('../middlewares/rateLimiter');

// POST /api/auth/register — Public user registration with token verification
router.post('/register', authController.register);

// GET & POST /api/auth/verify-email — Verify email via token
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-email', authController.verifyEmail);

// POST /api/auth/resend-verification — Resend verification token
router.post('/resend-verification', authController.resendVerification);

// POST /api/auth/login — apply strict rate limiting
router.post('/login', loginRateLimiter, authController.login);

// GET /api/auth/profile — requires valid JWT
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
