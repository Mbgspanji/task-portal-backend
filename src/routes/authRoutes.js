const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const { loginRateLimiter } = require('../middlewares/rateLimiter');

// POST /api/auth/login — apply strict rate limiting
router.post('/login', loginRateLimiter, authController.login);

// GET /api/auth/profile — requires valid JWT
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
