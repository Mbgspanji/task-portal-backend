const adminService = require('../services/adminService');

// Convert a route parameter into a positive integer or return null for invalid IDs.
const parseUserId = (value) => {
  const userId = Number(value);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
};

/**
 * POST /api/admin/users
 * Admin only: Create a new user account with selectable role.
 */
const createUser = async (req, res, next) => {
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
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const selectedRole = role === 'admin' ? 'admin' : 'employee';

    const newUser = await adminService.createUser({
      name,
      email,
      password,
      role: selectedRole,
    });

    res.status(201).json({
      success: true,
      message: `${selectedRole === 'admin' ? 'Admin' : 'Employee'} account created.`,
      data: newUser,
    });
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

/**
 * PATCH /api/admin/users/:id
 * Admin only: Update user's name, email, role, or password.
 */
const updateUser = async (req, res, next) => {
  try {
    const userId = parseUserId(req.params.id);
    if (userId === null) {
      return res.status(400).json({ success: false, message: 'User ID must be a positive integer.' });
    }

    const { name, email, role, password } = req.body;

    if (role && !['admin', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be admin or employee.' });
    }

    const updatedUser = await adminService.updateUser({
      userId,
      name,
      email,
      role,
      password,
      requestingUser: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Admin only: Delete user.
 */
const deleteUser = async (req, res, next) => {
  try {
    const userId = parseUserId(req.params.id);
    if (userId === null) {
      return res.status(400).json({ success: false, message: 'User ID must be a positive integer.' });
    }

    const deleted = await adminService.deleteUser({
      userId,
      requestingUser: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
      data: deleted,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  createEmployee: createUser, // backwards compatible alias
  getAllUsers,
  updateUser,
  deleteUser,
};
