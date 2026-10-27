/**
 * Global error handling middleware.
 * Catches any error thrown from route handlers or services.
 * Ensures no sensitive stack traces are leaked to the client in production.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[ERROR] ${req.method} ${req.originalUrl} — ${err.message}`);
  if (!isProduction) {
    console.error(err.stack);
  }

  const response = {
    success: false,
    message: err.message || 'An internal server error occurred.',
    ...(req.loginRateLimitWarning ? { warning: req.loginRateLimitWarning } : {}),
    // Only expose stack trace in development
    ...(isProduction ? {} : { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = { errorHandler };
