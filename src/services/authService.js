const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

const {
  findUserByEmail,
  findUserById,
  createUser,
  verifyUser,
} = require('../repositories/userRepository');

const {
  createOtp,
  findActiveOtpByEmail,
  markOtpUsed,
  incrementAttempt,
  invalidateOtpsByEmail,
  countRecentOtpsByEmail,
} = require('../repositories/otpRepository');

const { sendOtpEmail } = require('./emailService');

const SALT_ROUNDS      = 12;
const OTP_TTL_MINUTES  = 5;        // OTP berlaku 5 menit
const OTP_RESEND_LIMIT = 5;        // Maks kirim ulang dalam 1 jam
const OTP_MAX_ATTEMPTS = 5;        // Maks percobaan verifikasi per OTP

/**
 * Hasilkan 6 digit OTP menggunakan CSPRNG (kriptografis aman).
 * Selalu 6 karakter dengan padding nol di depan jika perlu.
 */
function generateOtp() {
  const num = crypto.randomInt(0, 1_000_000); // 0 – 999999
  return num.toString().padStart(6, '0');
}

// ─── Registrasi Publik ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Buat akun (belum aktif), lalu kirim OTP ke email.
 */
const registerWithOtp = async ({ name, email, password, role = 'employee' }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole  = role === 'admin' ? 'admin' : 'employee';

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    if (existingUser.is_verified) {
      const error = new Error('Email sudah terdaftar.');
      error.statusCode = 409;
      throw error;
    }
    // Akun ada tapi belum terverifikasi — izinkan kirim ulang OTP
  }

  let user = existingUser;

  if (!user) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    user = await createUser({
      name:         name.trim(),
      email:        normalizedEmail,
      hashedPassword,
      role:         normalizedRole,
      isVerified:   false,
    });
  }

  // Cek batas pengiriman OTP (maks 5 kali per jam)
  const recentCount = await countRecentOtpsByEmail(normalizedEmail, 60);
  if (recentCount >= OTP_RESEND_LIMIT) {
    const error = new Error('Terlalu banyak permintaan OTP. Silakan coba lagi dalam 1 jam.');
    error.statusCode = 429;
    throw error;
  }

  // Invalidasi OTP lama, buat OTP baru
  await invalidateOtpsByEmail(normalizedEmail);

  const otp       = generateOtp();
  const otpHash   = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await createOtp({ email: normalizedEmail, otpHash, expiresAt });

  // Kirim email OTP via Gmail SMTP
  await sendOtpEmail({ email: normalizedEmail, name: user.name, otp });

  console.log('\n==================================================');
  console.log(`📨 [OTP EMAIL TERKIRIM] Ke: ${normalizedEmail}`);
  console.log(`🔑 [KODE OTP]: ${otp} (Berlaku 5 menit)`);
  console.log('==================================================\n');

  return { user };
};

// ─── Verifikasi OTP ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/verify-otp
 * Verifikasi kode OTP, aktifkan akun, kembalikan JWT.
 */
const verifyOtpAndActivate = async ({ email, otp }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanOtp        = (otp || '').trim();

  if (!cleanOtp || !/^\d{6}$/.test(cleanOtp)) {
    const error = new Error('Kode OTP harus 6 digit angka.');
    error.statusCode = 400;
    throw error;
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    const error = new Error('Email tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  if (user.is_verified) {
    const error = new Error('Akun ini sudah terverifikasi. Silakan langsung login.');
    error.statusCode = 409;
    throw error;
  }

  const otpRecord = await findActiveOtpByEmail(normalizedEmail);
  if (!otpRecord) {
    const error = new Error('Kode OTP tidak ditemukan, sudah kedaluwarsa, atau sudah digunakan. Silakan minta kode baru.');
    error.statusCode = 400;
    throw error;
  }

  // Cek apakah percobaan sudah melebihi batas
  if (otpRecord.attempt_count >= OTP_MAX_ATTEMPTS) {
    const error = new Error('Terlalu banyak percobaan. Silakan minta kode OTP baru.');
    error.statusCode = 429;
    throw error;
  }

  const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otp_hash);
  if (!isMatch) {
    await incrementAttempt(otpRecord.id);
    const remaining = OTP_MAX_ATTEMPTS - (otpRecord.attempt_count + 1);
    const error = new Error(
      remaining > 0
        ? `Kode OTP salah. Sisa percobaan: ${remaining}.`
        : 'Kode OTP salah. Batas percobaan habis. Silakan minta kode baru.'
    );
    error.statusCode = 400;
    throw error;
  }

  // OTP cocok — tandai dipakai dan aktifkan akun
  await markOtpUsed(otpRecord.id);
  const verifiedUser = await verifyUser(user.id);

  const payload = {
    id:    verifiedUser.id,
    email: verifiedUser.email,
    role:  verifiedUser.role,
    name:  verifiedUser.name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return {
    token,
    user: {
      id:    verifiedUser.id,
      name:  verifiedUser.name,
      email: verifiedUser.email,
      role:  verifiedUser.role,
    },
  };
};

// ─── Kirim Ulang OTP ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/resend-otp
 * Kirim ulang OTP baru ke email (dengan rate-limiting).
 */
const resendOtp = async (email) => {
  if (!email || typeof email !== 'string' || !email.trim()) {
    const error = new Error('Email wajib diisi.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    // Jangan bocorkan apakah email terdaftar atau tidak
    return { message: 'Jika email terdaftar dan belum diverifikasi, kode OTP baru telah dikirim.' };
  }

  if (user.is_verified) {
    return { alreadyVerified: true, message: 'Akun ini sudah terverifikasi. Silakan langsung login.' };
  }

  // Rate-limit: maks 5 OTP per jam
  const recentCount = await countRecentOtpsByEmail(normalizedEmail, 60);
  if (recentCount >= OTP_RESEND_LIMIT) {
    const error = new Error('Terlalu banyak permintaan OTP. Silakan coba lagi dalam 1 jam.');
    error.statusCode = 429;
    throw error;
  }

  await invalidateOtpsByEmail(normalizedEmail);

  const otp       = generateOtp();
  const otpHash   = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await createOtp({ email: normalizedEmail, otpHash, expiresAt });
  await sendOtpEmail({ email: normalizedEmail, name: user.name, otp });

  console.log('\n==================================================');
  console.log(`📨 [OTP RESEND] Ke: ${normalizedEmail}`);
  console.log(`🔑 [KODE OTP BARU]: ${otp} (Berlaku 5 menit)`);
  console.log('==================================================\n');

  return { message: 'Kode OTP baru telah dikirim ke email Anda.' };
};

// ─── Registrasi oleh Admin ─────────────────────────────────────────────────────

/**
 * Buat akun langsung aktif (dipakai admin, tidak perlu OTP).
 */
const registerUser = async ({ name, email, password, role = 'employee' }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole  = role === 'admin' ? 'admin' : 'employee';

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await createUser({
    name:         name.trim(),
    email:        normalizedEmail,
    hashedPassword,
    role:         normalizedRole,
    isVerified:   true, // Akun admin langsung aktif
  });

  return user;
};

// ─── Login ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Verifikasi kredensial dan kembalikan JWT.
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    const error = new Error('Email atau password salah.');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Email atau password salah.');
    error.statusCode = 401;
    throw error;
  }

  if (user.is_verified === false) {
    const error = new Error('Akun Anda belum diverifikasi. Silakan cek email Anda untuk kode OTP.');
    error.statusCode = 403;
    error.isVerified = false;
    error.email = user.email;
    throw error;
  }

  const payload = {
    id:    user.id,
    email: user.email,
    role:  user.role,
    name:  user.name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return {
    token,
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    },
  };
};

// ─── Profile ───────────────────────────────────────────────────────────────────

const getProfile = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

module.exports = {
  registerWithOtp,
  verifyOtpAndActivate,
  resendOtp,
  registerUser,
  loginUser,
  getProfile,
};
