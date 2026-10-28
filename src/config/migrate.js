const pool = require('../config/db');

/**
 * Initialize database tables if they don't exist.
 * Uses prepared statements / parameterized queries throughout.
 */
const initializeDatabase = async () => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    // Keep schema creation atomic so a failed migration does not leave partial tables.
    await client.query('BEGIN');
    transactionStarted = true;

    // Create ENUM type for roles (idempotent)
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'employee');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create ENUM type for task status (idempotent)
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        role       user_role NOT NULL DEFAULT 'employee',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;
    `);

    // Remove the legacy role constraint if the database was created by an
    // earlier schema version that expected capitalized role values.
    await client.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check;
    `);

    // Tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       VARCHAR(255) NOT NULL,
        description TEXT,
        status      task_status NOT NULL DEFAULT 'todo',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    // Remove the legacy status constraint if the database was created by an
    // earlier schema version that expected display labels instead of enum values.
    await client.query(`
      ALTER TABLE tasks
      DROP CONSTRAINT IF EXISTS tasks_status_check;
    `);

    // OTP table for email verification (6-digit, single-use, expires in 5 min)
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(255) NOT NULL,
        otp_hash      TEXT NOT NULL,
        expires_at    TIMESTAMPTZ NOT NULL,
        is_used       BOOLEAN NOT NULL DEFAULT false,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verified_at   TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_otps_email   ON email_otps (email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps (expires_at);
    `);

    // Commit only after every type, table, column, and constraint is ready.
    await client.query('COMMIT');
    transactionStarted = false;
    console.log('✅ Database tables initialized');
  } catch (err) {
    // Roll back only when BEGIN succeeded; this avoids masking the original error.
    if (transactionStarted) {
      await client.query('ROLLBACK').catch((rollbackError) => {
        console.error('❌ Database rollback error:', rollbackError.message);
      });
    }
    console.error('❌ Database initialization error:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase };
