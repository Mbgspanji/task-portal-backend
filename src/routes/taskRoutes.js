const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// All task routes require authentication
router.use(authenticate);

// GET /api/tasks — Admin gets all, Employee gets their own
router.get('/', taskController.getTasks);

// POST /api/tasks — Any authenticated user can create a task for themselves
router.post('/', taskController.createTask);

// PATCH /api/tasks/:id/status — Employee updates own task status; Admin can update any
router.patch('/:id/status', taskController.updateTaskStatus);

// DELETE /api/tasks/:id — Admin only
router.delete('/:id', authorize('admin'), taskController.deleteTask);

module.exports = router;
