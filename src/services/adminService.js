const { getAllUsers } = require('../repositories/userRepository');
const { registerUser } = require('./authService');

/**
 * Admin Service — logic specific to Admin operations.
 */

/**
 * Create a new employee account (Admin only).
 */
const createEmployee = async ({ name, email, password }) => {
  return registerUser({ name, email, password, role: 'employee' });
};

/**
 * Get a list of all users (Admin only).
 */
const listAllUsers = async () => {
  return getAllUsers();
};

module.exports = { createEmployee, listAllUsers };
