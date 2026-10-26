const pool = require('../config/db');

/**
 * Task Repository — all DB queries for tasks.
 * Uses parameterized queries to prevent SQL Injection.
 */

const getAllTasks = async () => {
  const query = `
    SELECT t.id, t.title, t.description, t.status, t.created_at, t.updated_at,
           u.id AS user_id, u.name AS user_name, u.email AS user_email
    FROM tasks t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
};

const getTasksByUserId = async (userId) => {
  const query = `
    SELECT t.id, t.title, t.description, t.status, t.created_at, t.updated_at,
           u.id AS user_id, u.name AS user_name, u.email AS user_email
    FROM tasks t
    JOIN users u ON t.user_id = u.id
    WHERE t.user_id = $1
    ORDER BY t.created_at DESC
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
};

const getTaskById = async (taskId) => {
  const query = `
    SELECT t.id, t.title, t.description, t.status, t.created_at, t.updated_at,
           u.id AS user_id, u.name AS user_name, u.email AS user_email
    FROM tasks t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [taskId]);
  return rows[0] || null;
};

const createTask = async ({ userId, title, description, status = 'todo' }) => {
  const query = `
    INSERT INTO tasks (user_id, title, description, status)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, title, description, status, created_at, updated_at
  `;
  const { rows } = await pool.query(query, [userId, title, description, status]);
  return rows[0];
};

const updateTaskStatus = async ({ taskId, status }) => {
  const query = `
    UPDATE tasks
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, user_id, title, description, status, updated_at
  `;
  const { rows } = await pool.query(query, [status, taskId]);
  return rows[0] || null;
};

const deleteTask = async (taskId) => {
  const query = 'DELETE FROM tasks WHERE id = $1 RETURNING id';
  const { rows } = await pool.query(query, [taskId]);
  return rows[0] || null;
};

module.exports = {
  getAllTasks,
  getTasksByUserId,
  getTaskById,
  createTask,
  updateTaskStatus,
  deleteTask,
};
