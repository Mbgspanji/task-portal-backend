const pool = require('../config/db');

/**
 * OTP Repository — semua query DB untuk tabel email_otps.
 * Menggunakan parameterized query untuk mencegah SQL Injection.
 */

/** Simpan OTP baru (hash bcrypt dari 6 digit) ke DB */
const createOtp = async ({ email, otpHash, expiresAt }) => {
  const query = `
    INSERT INTO email_otps (email, otp_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, email, expires_at, created_at
  `;
  const { rows } = await pool.query(query, [email, otpHash, expiresAt]);
  return rows[0];
};

/**
 * Cari OTP aktif terbaru untuk email tertentu.
 * "Aktif" = belum kedaluwarsa, belum digunakan, dan attempt < 5.
 */
const findActiveOtpByEmail = async (email) => {
  const query = `
    SELECT *
    FROM   email_otps
    WHERE  email      = $1
      AND  is_used    = false
      AND  expires_at > NOW()
      AND  attempt_count < 5
    ORDER  BY created_at DESC
    LIMIT  1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
};

/** Tandai OTP sebagai sudah dipakai */
const markOtpUsed = async (id) => {
  const query = `
    UPDATE email_otps
    SET    is_used = true, verified_at = NOW()
    WHERE  id = $1
    RETURNING id
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

/** Tambah hitungan percobaan gagal pada OTP */
const incrementAttempt = async (id) => {
  const query = `
    UPDATE email_otps
    SET    attempt_count = attempt_count + 1
    WHERE  id = $1
    RETURNING id, attempt_count
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

/** Invalidasi semua OTP lama untuk email (sebelum kirim OTP baru) */
const invalidateOtpsByEmail = async (email) => {
  const query = `
    UPDATE email_otps
    SET    is_used = true
    WHERE  email = $1
      AND  is_used = false
  `;
  await pool.query(query, [email]);
};

/** Hapus OTP yang sudah kedaluwarsa dan tidak lagi diperlukan (untuk cron job harian) */
const deleteExpiredOtps = async () => {
  const query = `
    DELETE FROM email_otps
    WHERE expires_at < NOW()
      AND (is_used = true OR attempt_count >= 5 OR created_at < NOW() - INTERVAL '1 day')
  `;
  const result = await pool.query(query);
  return result.rowCount;
};

/** Hitung jumlah OTP yang dikirim ke email dalam rentang waktu tertentu */
const countRecentOtpsByEmail = async (email, sinceMinutes = 60) => {
  const query = `
    SELECT COUNT(*) AS count
    FROM   email_otps
    WHERE  email      = $1
      AND  created_at > NOW() - INTERVAL '${sinceMinutes} minutes'
  `;
  const { rows } = await pool.query(query, [email]);
  return parseInt(rows[0].count, 10);
};

module.exports = {
  createOtp,
  findActiveOtpByEmail,
  markOtpUsed,
  incrementAttempt,
  invalidateOtpsByEmail,
  deleteExpiredOtps,
  countRecentOtpsByEmail,
};
