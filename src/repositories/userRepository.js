const pool = require('../config/db');

/**
 * User Repository — all DB queries for users.
 * Uses parameterized ($1, $2, ...) queries to prevent SQL Injection.
 */

const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1 LIMIT 1';
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
};

const findUserById = async (id) => {
  const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = $1 LIMIT 1';
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

const createUser = async ({ name, email, hashedPassword, role = 'employee' }) => {
  const query = `
    INSERT INTO users (name, email, password, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role, created_at
  `;
  const { rows } = await pool.query(query, [name, email, hashedPassword, role]);
  return rows[0];
};

const getAllUsers = async () => {
  const query = 'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC';
  const { rows } = await pool.query(query);
  return rows;
};

module.exports = { findUserByEmail, findUserById, createUser, getAllUsers };
