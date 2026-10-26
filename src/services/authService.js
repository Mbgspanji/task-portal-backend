const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserById, createUser } = require('../repositories/userRepository');

const SALT_ROUNDS = 12; // bcrypt cost factor — high enough to be secure

/**
 * Register a new user.
 * Only called by Admin endpoints to create employee accounts.
 */
const registerUser = async ({ name, email, password, role = 'employee' }) => {
  // Check for existing user
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  // Hash password with bcrypt (never store plaintext)
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await createUser({ name, email, hashedPassword, role });
  return user;
};

/**
 * Login — verify credentials and issue JWT.
 */
const loginUser = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) {
    // Use a generic message to prevent user enumeration
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

module.exports = { registerUser, loginUser, getProfile };
