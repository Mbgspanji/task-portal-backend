const { ipKeyGenerator, rateLimit } = require('express-rate-limit');
const crypto = require('crypto');

const DEVICE_COOKIE_NAME = 'secure_task_device';
const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
const deviceCookieSecret =
  process.env.DEVICE_COOKIE_SECRET ||
  process.env.JWT_SECRET ||
  crypto.randomBytes(32).toString('hex');

const getCookie = (cookieHeader, name) =>
  cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);

const createDeviceToken = () => {
  const deviceId = crypto.randomUUID();
  const signature = crypto
    .createHmac('sha256', deviceCookieSecret)
    .update(deviceId)
    .digest('base64url');

  return `${deviceId}.${signature}`;
};

const isValidDeviceToken = (token) => {
  const [deviceId, signature] = token?.split('.') || [];
  if (!deviceId || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', deviceCookieSecret)
    .update(deviceId)
    .digest('base64url');

  return (
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  );
};

/**
 * Assign a stable, opaque identifier to each browser/device.
 * The IP fallback only applies to the first request before the cookie is set.
 */
const deviceIdentifier = (req, res, next) => {
  const existingDeviceToken = getCookie(req.headers.cookie, DEVICE_COOKIE_NAME);
  const hasValidDeviceToken = isValidDeviceToken(existingDeviceToken);
  const deviceToken = hasValidDeviceToken
    ? existingDeviceToken
    : createDeviceToken();

  req.deviceId = deviceToken;

  if (!hasValidDeviceToken) {
    const isProduction = process.env.NODE_ENV === 'production';
    const secure = isProduction ? '; Secure' : '';
    const sameSite = isProduction ? 'None' : 'Lax';
    res.setHeader(
      'Set-Cookie',
      `${DEVICE_COOKIE_NAME}=${deviceToken}; Max-Age=${DEVICE_COOKIE_MAX_AGE}; Path=/; HttpOnly; SameSite=${sameSite}${secure}`
    );
  }

  next();
};

const deviceKeyGenerator = (req) =>
  req.deviceId || ipKeyGenerator(req.ip);

/**
 * Rate Limiter for Login endpoint:
 * - Max 5 failed attempts per 15 minutes per device
 * - Returns 429 status with a clear message
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per window
  keyGenerator: deviceKeyGenerator,
  standardHeaders: true,    // Return rate limit info in 'RateLimit-*' headers
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts (4xx/5xx responses)
  message: {
    success: false,
    message:
      'Too many login attempts from this device. You have been blocked for 15 minutes. Please try again later.',
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * General API rate limiter:
 * - 200 requests per 15 minutes per device for all other routes
 */
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: deviceKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this device, please try again after 15 minutes.',
  },
});

module.exports = { deviceIdentifier, loginRateLimiter, generalRateLimiter };
