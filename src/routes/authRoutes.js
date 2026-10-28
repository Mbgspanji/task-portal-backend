const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');
const { authenticate }   = require('../middlewares/authMiddleware');
const { loginRateLimiter } = require('../middlewares/rateLimiter');

// POST /api/auth/register — Registrasi publik, kirim OTP ke email
router.post('/register', authController.register);

// POST /api/auth/verify-otp — Verifikasi kode OTP 6 digit
router.post('/verify-otp', authController.verifyOtp);

// POST /api/auth/resend-otp — Kirim ulang OTP (dengan rate-limiting)
router.post('/resend-otp', authController.resendOtp);

// POST /api/auth/login — Login dengan rate limiting
router.post('/login', loginRateLimiter, authController.login);

// GET /api/auth/profile — Profil pengguna (butuh JWT)
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
