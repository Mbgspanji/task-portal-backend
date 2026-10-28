const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  findUserByEmail,
  findUserById,
  findUserByVerificationToken,
  createUser,
  verifyUser,
  updateVerificationToken,
} = require('../repositories/userRepository');
const { sendVerificationEmail } = require('./emailService');

const SALT_ROUNDS = 12;

/**
 * Public User Registration with Token-Based Email Verification (Mailtrap).
 * Creator can choose role ('employee' or 'admin').
 */
const registerWithVerification = async ({ name, email, password, role = 'employee' }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = role === 'admin' ? 'admin' : 'employee';

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Generate 64-character verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const newUser = await createUser({
    name: name.trim(),
    email: normalizedEmail,
    hashedPassword,
    role: normalizedRole,
    isVerified: false,
    verificationToken,
    verificationTokenExpiresAt,
  });

  // Send verification email via Mailtrap
  const mailResult = await sendVerificationEmail({
    email: normalizedEmail,
    name: newUser.name,
    token: verificationToken,
  });

  return {
    user: newUser,
    previewToken: mailResult?.previewToken,
    method: mailResult?.method,
  };
};

/**
 * Verify user's email using token.
 */
const verifyEmailToken = async (token) => {
  if (!token || typeof token !== 'string') {
    const error = new Error('Verification token is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanToken = token.trim();
  const user = await findUserByVerificationToken(cleanToken);

  if (!user) {
    const error = new Error('Token verifikasi tidak valid atau sudah kedaluwarsa.');
    error.statusCode = 400;
    throw error;
  }

  if (user.verification_token_expires_at && new Date(user.verification_token_expires_at) < new Date()) {
    const error = new Error('Token verifikasi telah kedaluwarsa. Silakan minta token baru.');
    error.statusCode = 400;
    throw error;
  }

  const verifiedUser = await verifyUser(user.id);

  // Generate auth token so user is automatically authenticated upon verification
  const payload = {
    id: verifiedUser.id,
    email: verifiedUser.email,
    role: verifiedUser.role,
    name: verifiedUser.name,
  };

  const authToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return {
    token: authToken,
    user: {
      id: verifiedUser.id,
      name: verifiedUser.name,
      email: verifiedUser.email,
      role: verifiedUser.role,
    },
  };
};

/**
 * Resend verification token to user's email.
 */
const resendVerificationToken = async (email) => {
  if (!email || typeof email !== 'string') {
    const error = new Error('Email is required');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    const error = new Error('Email tidak terdaftar.');
    error.statusCode = 404;
    throw error;
  }

  if (user.is_verified) {
    return {
      alreadyVerified: true,
      message: 'Akun ini sudah terverifikasi sebelumnya. Silakan langsung login.',
    };
  }

  const newToken = crypto.randomBytes(32).toString('hex');
  const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await updateVerificationToken(user.id, newToken, newExpiresAt);

  const mailResult = await sendVerificationEmail({
    email: normalizedEmail,
    name: user.name,
    token: newToken,
  });

  return {
    alreadyVerified: false,
    message: 'Token verifikasi baru telah dikirimkan ke email Anda.',
    previewToken: mailResult?.previewToken,
  };
};

/**
 * Register a user created by Admin.
 * Admin can choose role ('employee' or 'admin'). Directly verified.
 */
const registerUser = async ({ name, email, password, role = 'employee' }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = role === 'admin' ? 'admin' : 'employee';

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await createUser({
    name: name.trim(),
    email: normalizedEmail,
    hashedPassword,
    role: normalizedRole,
    isVerified: true,
  });

  return user;
};

/**
 * Login — verify credentials and check verification status.
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check if account has verified email
  if (user.is_verified === false) {
    const error = new Error('Akun Anda belum diverifikasi. Silakan periksa email Mailtrap Anda untuk verifikasi token.');
    error.statusCode = 403;
    error.isVerified = false;
    error.email = user.email;
    throw error;
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

/**
 * Get profile for the currently authenticated user.
 */
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
  registerWithVerification,
  verifyEmailToken,
  resendVerificationToken,
  registerUser,
  loginUser,
  getProfile,
};
