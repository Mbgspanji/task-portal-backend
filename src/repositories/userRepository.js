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
  const query = 'SELECT id, name, email, role, is_verified, created_at, updated_at FROM users WHERE id = $1 LIMIT 1';
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

const findUserByVerificationToken = async (token) => {
  const query = `
    SELECT id, name, email, role, is_verified, verification_token_expires_at
    FROM users
    WHERE verification_token = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [token]);
  return rows[0] || null;
};

const createUser = async ({
  name,
  email,
  hashedPassword,
  role = 'employee',
  isVerified = true,
  verificationToken = null,
  verificationTokenExpiresAt = null,
}) => {
  const query = `
    INSERT INTO users (name, email, password, role, is_verified, verification_token, verification_token_expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, email, role, is_verified, created_at
  `;
  const { rows } = await pool.query(query, [
    name,
    email,
    hashedPassword,
    role,
    isVerified,
    verificationToken,
    verificationTokenExpiresAt,
  ]);
  return rows[0];
};

const verifyUser = async (id) => {
  const query = `
    UPDATE users
    SET is_verified = true, verification_token = NULL, verification_token_expires_at = NULL, updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, email, role, is_verified, created_at, updated_at
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

const updateVerificationToken = async (userId, token, expiresAt) => {
  const query = `
    UPDATE users
    SET verification_token = $1, verification_token_expires_at = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING id, name, email, verification_token, verification_token_expires_at
  `;
  const { rows } = await pool.query(query, [token, expiresAt, userId]);
  return rows[0] || null;
};

const updateUser = async ({ id, name, email, role, hashedPassword }) => {
  let query;
  let params;

  if (hashedPassword) {
    query = `
      UPDATE users
      SET name = $1, email = $2, role = $3, password = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, name, email, role, is_verified, created_at, updated_at
    `;
    params = [name, email, role, hashedPassword, id];
  } else {
    query = `
      UPDATE users
      SET name = $1, email = $2, role = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, email, role, is_verified, created_at, updated_at
    `;
    params = [name, email, role, id];
  }

  const { rows } = await pool.query(query, params);
  return rows[0] || null;
};

const deleteUser = async (id) => {
  const query = 'DELETE FROM users WHERE id = $1 RETURNING id, name, email';
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

const getAllUsers = async () => {
  const query = 'SELECT id, name, email, role, is_verified, created_at, updated_at FROM users ORDER BY created_at DESC';
  const { rows } = await pool.query(query);
  return rows;
};

module.exports = {
  findUserByEmail,
  findUserById,
  findUserByVerificationToken,
  createUser,
  verifyUser,
  updateVerificationToken,
  updateUser,
  deleteUser,
  getAllUsers,
};
