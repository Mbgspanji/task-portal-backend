const authService = require('../services/authService');

/**
 * POST /api/auth/register
 * Public registration with email token verification.
 * User can choose role ('employee' or 'admin').
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password minimal 8 karakter.' });
    }

    const selectedRole = role === 'admin' ? 'admin' : 'employee';

    const result = await authService.registerWithVerification({
      name,
      email,
      password,
      role: selectedRole,
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Silakan periksa inbox email Mailtrap Anda untuk kode token verifikasi akun.',
      data: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        isVerified: result.user.is_verified,
        previewToken: result.previewToken, // provided for convenient local/dev testing
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET or POST /api/auth/verify-email
 * Verifies email via token and returns JWT token for instant login.
 */
const verifyEmail = async (req, res, next) => {
  try {
    const token = req.query.token || req.body.token;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token verifikasi wajib disertakan.' });
    }

    const result = await authService.verifyEmailToken(token);

    res.status(200).json({
      success: true,
      message: 'Email berhasil diverifikasi! Akun Anda kini aktif.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/resend-verification
 * Resends verification token to the user's email.
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email wajib diisi.' });
    }

    const result = await authService.resendVerificationToken(email);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { previewToken: result.previewToken },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT token.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await authService.loginUser({ email, password });
    res.status(200).json({ success: true, message: 'Login successful.', data: result });
  } catch (err) {
    if (req.loginRateLimitWarning && err.statusCode === 401) {
      err.message = `${err.message}. ${req.loginRateLimitWarning}`;
    }
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

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  getProfile,
};
