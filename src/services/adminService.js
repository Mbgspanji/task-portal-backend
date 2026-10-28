const bcrypt = require('bcrypt');
const {
  getAllUsers,
  findUserById,
  findUserByEmail,
  updateUser: repoUpdateUser,
  deleteUser: repoDeleteUser,
} = require('../repositories/userRepository');
const { registerUser } = require('./authService');

const SALT_ROUNDS = 12;

/**
 * Admin Service — logic specific to Admin operations.
 */

/**
 * Create a new user account (Admin only).
 * Admin can select role: 'admin' or 'employee'.
 */
const createUser = async ({ name, email, password, role = 'employee' }) => {
  return registerUser({ name, email, password, role });
};

/**
 * Alias for backwards compatibility.
 */
const createEmployee = async ({ name, email, password }) => {
  return createUser({ name, email, password, role: 'employee' });
};

/**
 * List all users (Admin only).
 */
const listAllUsers = async () => {
  return getAllUsers();
};

/**
 * Update an existing user (Admin only).
 */
const updateUser = async ({ userId, name, email, role, password, requestingUser }) => {
  const user = await findUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Prevent demoting self
  if (requestingUser.id === userId && role && role !== 'admin') {
    const error = new Error('Anda tidak dapat mencabut hak akses admin Anda sendiri.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : user.email;
  if (normalizedEmail !== user.email) {
    const existing = await findUserByEmail(normalizedEmail);
    if (existing && existing.id !== userId) {
      const error = new Error('Email sudah digunakan oleh pengguna lain.');
      error.statusCode = 409;
      throw error;
    }
  }

  let hashedPassword = null;
  if (password && typeof password === 'string' && password.trim()) {
    if (password.length < 8) {
      const error = new Error('Password baru minimal 8 karakter.');
      error.statusCode = 400;
      throw error;
    }
    hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const updated = await repoUpdateUser({
    id: userId,
    name: name ? name.trim() : user.name,
    email: normalizedEmail,
    role: role || user.role,
    hashedPassword,
  });

  return updated;
};

/**
 * Delete a user (Admin only).
 */
const deleteUser = async ({ userId, requestingUser }) => {
  if (requestingUser.id === userId) {
    const error = new Error('Anda tidak dapat menghapus akun Anda sendiri.');
    error.statusCode = 400;
    throw error;
  }

  const user = await findUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return repoDeleteUser(userId);
};

module.exports = {
  createUser,
  createEmployee,
  listAllUsers,
  updateUser,
  deleteUser,
};
