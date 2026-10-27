const jwt = require('jsonwebtoken');

/**
 * Middleware: verify the JWT and attach the decoded user to req.user.
 * Rejects requests without a valid Bearer token.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  // Remove the scheme and reject an empty token before verification.
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    // Verify the signature and expiry before allowing access to protected routes.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/**
 * Middleware factory: restrict access to specific roles.
 * Usage: authorize('admin') or authorize('admin', 'employee').
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Authentication must happen before authorization can check the role.
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires role(s) [${roles.join(', ')}]. Your role is '${req.user.role}'.`,
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
