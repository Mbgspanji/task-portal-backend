const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter for Login endpoint:
 * - Max 5 failed attempts per 15 minutes per IP
 * - Returns 429 status with a clear message
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // max 5 requests per window
  standardHeaders: true,    // Return rate limit info in 'RateLimit-*' headers
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts (4xx/5xx responses)
  message: {
    success: false,
    message:
      'Too many login attempts from this IP. You have been blocked for 15 minutes. Please try again later.',
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * General API rate limiter:
 * - 200 requests per 15 minutes per IP for all other routes
 */
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

module.exports = { loginRateLimiter, generalRateLimiter };
