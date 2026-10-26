const taskService = require('../services/taskService');

/**
 * GET /api/tasks
 * Admin: returns all tasks.
 * Employee: returns only their own tasks.
 */
const getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasks(req.user);
    res.status(200).json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tasks
 * Creates a new task for the authenticated user.
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status } = req.body;
    const task = await taskService.createTask({
      userId: req.user.id,
      title,
      description,
      status,
    });
    res.status(201).json({ success: true, message: 'Task created successfully.', data: task });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tasks/:id
 * Updates the title and description of a task.
 */
const updateTask = async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { title, description } = req.body;
    const updatedTask = await taskService.updateTask({
      taskId,
      title,
      description,
      requestingUser: req.user,
    });
    res.status(200).json({ success: true, message: 'Task updated.', data: updatedTask });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tasks/:id/status
 * Updates only the status of a task.
 * Employee can only update their own tasks.
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const updatedTask = await taskService.updateTaskStatus({
      taskId,
      status,
      requestingUser: req.user,
    });
    res.status(200).json({ success: true, message: 'Task status updated.', data: updatedTask });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/tasks/:id
 * Admin only: deletes any task.
 */
const deleteTask = async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const deleted = await taskService.deleteTask({ taskId, requestingUser: req.user });
    res.status(200).json({ success: true, message: 'Task deleted successfully.', data: deleted });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTasks, createTask, updateTask, updateTaskStatus, deleteTask };
