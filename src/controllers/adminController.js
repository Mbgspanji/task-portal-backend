const adminService = require('../services/adminService');

/**
 * POST /api/admin/users
 * Admin only: Create a new employee account.
 */
const createEmployee = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate the request shape before accessing string properties.
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const newUser = await adminService.createEmployee({ name, email, password });
    res.status(201).json({ success: true, message: 'Employee account created.', data: newUser });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users
 * Admin only: Get all users.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await adminService.listAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

module.exports = { createEmployee, getAllUsers };
