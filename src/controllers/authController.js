const authService = require('../services/authService');

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT token.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Reject malformed payloads before sending them to the authentication service.
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await authService.loginUser({ email, password });
    res.status(200).json({ success: true, message: 'Login successful.', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/profile
 * Returns the profile of the currently authenticated user.
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getProfile };
