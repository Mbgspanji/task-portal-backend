const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// All admin routes: must be authenticated AND have 'admin' role
router.use(authenticate, authorize('admin'));

// POST /api/admin/users — Create a new user account with role selection
router.post('/users', adminController.createUser);

// GET /api/admin/users — List all users
router.get('/users', adminController.getAllUsers);

// PATCH /api/admin/users/:id — Update user details or role
router.patch('/users/:id', adminController.updateUser);

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
