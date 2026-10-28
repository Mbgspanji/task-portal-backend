const nodemailer = require('nodemailer');

/**
 * Membuat Nodemailer transporter menggunakan Gmail SMTP.
 * Variabel .env yang digunakan:
 *   SMTP_HOST     (default: smtp.gmail.com)
 *   SMTP_PORT     (default: 465)
 *   SMTP_USER     — alamat Gmail pengirim
 *   SMTP_PASS     — Gmail App Password (16 karakter, boleh ada spasi)
 *   MAIL_FROM_EMAIL  (default: nilai SMTP_USER)
 *   MAIL_FROM_NAME   (default: SecureTask Portal)
 */
function createTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = (process.env.SMTP_PASS || '').replace(/\s/g, ''); // hapus spasi dari App Password

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP_USER dan SMTP_PASS wajib diisi di file .env');
  }

  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465, // true untuk port 465 (SSL)
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Mengirim kode OTP 6 digit ke email pendaftar.
 *
 * @param {object} options
 * @param {string} options.email   - Alamat email tujuan
 * @param {string} options.name    - Nama pengguna
 * @param {string} options.otp     - Kode OTP 6 digit
 */
const sendOtpEmail = async ({ email, name, otp }) => {
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;
  const fromName  = process.env.MAIL_FROM_NAME  || 'SecureTask Portal';
  const from      = `"${fromName}" <${fromEmail}>`;
  const subject   = '🔐 Kode OTP Verifikasi Akun SecureTask Portal';

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifikasi OTP</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f0f4f8;
          margin: 0;
          padding: 24px 16px;
          color: #1e293b;
        }
        .card {
          max-width: 480px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          padding: 36px 32px;
          box-shadow: 0 8px 32px rgba(48, 71, 116, 0.12);
        }
        .header { text-align: center; margin-bottom: 24px; }
        .logo-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #3150cf, #6378ff);
          border-radius: 14px;
          margin-bottom: 14px;
          font-size: 26px;
        }
        h1 { font-size: 22px; color: #172b4d; margin: 0 0 6px; }
        p  { color: #64748b; font-size: 15px; line-height: 1.65; margin: 0 0 14px; }
        .otp-box {
          background: #f0f4ff;
          border: 2px solid #c7d2fe;
          border-radius: 12px;
          padding: 20px 16px;
          text-align: center;
          margin: 28px 0;
        }
        .otp-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #3150cf;
          margin-bottom: 8px;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 42px;
          font-weight: 800;
          color: #1e3bb3;
          letter-spacing: 0.25em;
          line-height: 1;
        }
        .otp-validity {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 10px;
        }
        .warning-box {
          background: #fff8ed;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13px;
          color: #92400e;
          margin-top: 20px;
          text-align: left;
        }
        .footer {
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo-badge">🛡️</div>
          <h1>Verifikasi Email Anda</h1>
          <p>Halo <strong>${name}</strong>, terima kasih telah mendaftar di <strong>SecureTask Portal</strong>.<br>
          Gunakan kode OTP di bawah ini untuk mengaktifkan akun Anda.</p>
        </div>

        <div class="otp-box">
          <div class="otp-label">Kode OTP Anda</div>
          <div class="otp-code">${otp}</div>
          <div class="otp-validity">⏱ Berlaku selama <strong>5 menit</strong></div>
        </div>

        <div class="warning-box">
          ⚠️ <strong>Jangan bagikan kode ini kepada siapa pun</strong>, termasuk pihak yang mengaku dari SecureTask Portal.
          Tim kami tidak pernah meminta kode OTP Anda.
        </div>

        <div class="footer">
          Jika Anda tidak merasa mendaftar di SecureTask Portal, abaikan email ini.<br>
          Kode OTP ini hanya dapat digunakan <strong>satu kali</strong>.<br><br>
          &copy; ${new Date().getFullYear()} SecureTask Portal. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const text =
    `Halo ${name},\n\n` +
    `Terima kasih telah mendaftar di SecureTask Portal.\n\n` +
    `Kode OTP verifikasi Anda adalah:\n\n` +
    `  ${otp}\n\n` +
    `Kode berlaku selama 5 menit dan hanya dapat digunakan satu kali.\n\n` +
    `JANGAN bagikan kode ini kepada siapa pun.\n\n` +
    `Jika Anda tidak mendaftar, abaikan email ini.\n\n` +
    `— Tim SecureTask Portal`;

  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from,
    to:      email,
    subject,
    text,
    html,
  });

  console.log(`✅ [Email OTP] Berhasil dikirim ke ${email} — MessageId: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
};

module.exports = { sendOtpEmail };
