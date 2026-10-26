const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// All admin routes: must be authenticated AND have 'admin' role
router.use(authenticate, authorize('admin'));

// POST /api/admin/users — Create a new employee account
router.post('/users', adminController.createEmployee);

// GET /api/admin/users — List all users
router.get('/users', adminController.getAllUsers);

module.exports = router;
