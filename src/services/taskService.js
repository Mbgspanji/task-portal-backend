const xss = require('xss');
const taskRepository = require('../repositories/taskRepository');

const VALID_STATUSES = ['todo', 'in_progress', 'done'];

/**
 * Sanitize a string against XSS attacks.
 */
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return xss(str.trim());
};

// Keep validation in the service so all callers receive the same behavior.
const validateTaskId = (taskId) => {
  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    const error = new Error('Task ID must be a positive integer');
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Get tasks based on user role:
 * - Admin: all tasks
 * - Employee: only their own tasks
 */
const getTasks = async (user) => {
  if (user.role === 'admin') {
    return taskRepository.getAllTasks();
  }
  return taskRepository.getTasksByUserId(user.id);
};

/**
 * Create a new task.
 * Sanitizes title and description to prevent XSS.
 */
const createTask = async ({ userId, title, description, status }) => {
  const sanitizedTitle = sanitize(title);
  const sanitizedDescription = description == null ? '' : sanitize(description);

  if (typeof sanitizedTitle !== 'string' || !sanitizedTitle) {
    const error = new Error('Task title is required');
    error.statusCode = 400;
    throw error;
  }

  if (typeof sanitizedDescription !== 'string') {
    const error = new Error('Task description must be a string');
    error.statusCode = 400;
    throw error;
  }

  if (status && !VALID_STATUSES.includes(status)) {
    const error = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  return taskRepository.createTask({
    userId,
    title: sanitizedTitle,
    description: sanitizedDescription,
    status: status || 'todo',
  });
};

/**
 * Update a task's editable fields.
 * Employees can only edit their own tasks; admins can edit any task.
 */
const updateTask = async ({ taskId, title, description, requestingUser }) => {
  validateTaskId(taskId);
  const sanitizedTitle = sanitize(title);
  const sanitizedDescription = description == null ? '' : sanitize(description);

  if (typeof sanitizedTitle !== 'string' || !sanitizedTitle) {
    const error = new Error('Task title is required');
    error.statusCode = 400;
    throw error;
  }

  if (typeof sanitizedDescription !== 'string') {
    const error = new Error('Task description must be a string');
    error.statusCode = 400;
    throw error;
  }

  const task = await taskRepository.getTaskById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  if (requestingUser.role === 'employee' && task.user_id !== requestingUser.id) {
    const error = new Error('Forbidden: You can only edit your own tasks');
    error.statusCode = 403;
    throw error;
  }

  return taskRepository.updateTask({ taskId, title: sanitizedTitle, description: sanitizedDescription });
};

/**
 * Update only the status of a task.
 * Employee can only update their own tasks.
 * Admin can update any task.
 */
const updateTaskStatus = async ({ taskId, status, requestingUser }) => {
  validateTaskId(taskId);
  if (!VALID_STATUSES.includes(status)) {
    const error = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const task = await taskRepository.getTaskById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check: Employee can only modify their own tasks
  if (requestingUser.role === 'employee' && task.user_id !== requestingUser.id) {
    const error = new Error('Forbidden: You can only update your own tasks');
    error.statusCode = 403;
    throw error;
  }

  return taskRepository.updateTaskStatus({ taskId, status });
};

/**
 * Delete a task.
 * Admin can delete any task.
 * Employee can delete their own tasks.
 */
const deleteTask = async ({ taskId, requestingUser }) => {
  validateTaskId(taskId);
  const task = await taskRepository.getTaskById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check: Employee can only delete their own task
  if (requestingUser.role === 'employee' && task.user_id !== requestingUser.id) {
    const error = new Error('Forbidden: You can only delete your own tasks');
    error.statusCode = 403;
    throw error;
  }

  return taskRepository.deleteTask(taskId);
};

module.exports = { getTasks, createTask, updateTask, updateTaskStatus, deleteTask };
