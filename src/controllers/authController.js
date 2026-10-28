const authService = require('../services/authService');

// ─── POST /api/auth/register ───────────────────────────────────────────────────
/**
 * Registrasi publik. Membuat akun (belum aktif) dan mengirim OTP ke email.
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

    const result = await authService.registerWithOtp({ name, email, password, role: selectedRole });

    res.status(201).json({
      success: true,
      message: `Registrasi berhasil! Kode OTP 6 digit telah dikirim ke ${result.user.email}. Berlaku 5 menit.`,
      data: {
        id:         result.user.id,
        name:       result.user.name,
        email:      result.user.email,
        role:       result.user.role,
        isVerified: result.user.is_verified,
        previewOtp: result.previewOtp,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/verify-otp ─────────────────────────────────────────────────
/**
 * Verifikasi kode OTP 6 digit. Jika cocok, akun diaktifkan dan JWT dikembalikan.
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email wajib diisi.' });
    }
    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({ success: false, message: 'Kode OTP wajib diisi.' });
    }

    const result = await authService.verifyOtpAndActivate({ email, otp });

    res.status(200).json({
      success: true,
      message: 'Email berhasil diverifikasi! Akun Anda kini aktif.',
      data:    result,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/resend-otp ─────────────────────────────────────────────────
/**
 * Kirim ulang OTP baru ke email (dengan rate-limiting).
 */
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email wajib diisi.' });
    }

    const result = await authService.resendOtp(email);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        previewOtp: result.previewOtp,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Login — verifikasi kredensial dan kembalikan JWT.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
    }

    const result = await authService.loginUser({ email, password });

    res.status(200).json({ success: true, message: 'Login berhasil.', data: result });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/profile ────────────────────────────────────────────────────
/**
 * Kembalikan profil pengguna yang sedang login.
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
  verifyOtp,
  resendOtp,
  login,
  getProfile,
};
