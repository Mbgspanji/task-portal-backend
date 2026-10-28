const nodemailer = require('nodemailer');

/**
 * Send email verification token via Mailtrap using nodemailer.
 */
const sendVerificationEmail = async ({ email, name, token }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

  const fromEmail = process.env.MAIL_FROM_EMAIL || 'no-reply@securetask.local';
  const fromName = process.env.MAIL_FROM_NAME || 'SecureTask Portal';
  const from = `"${fromName}" <${fromEmail}>`;
  const subject = '🔐 Verifikasi Akun SecureTask Portal Anda';

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifikasi Akun</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f1629; margin: 0; padding: 20px; color: #e2e8f8; }
        .card { max-width: 540px; margin: 0 auto; background: #141d35; border: 1px solid rgba(99, 120, 255, 0.25); border-radius: 16px; padding: 32px; box-shadow: 0 12px 36px rgba(0,0,0,0.4); }
        .header { text-align: center; margin-bottom: 24px; }
        .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #3150cf; border-radius: 12px; margin-bottom: 12px; font-size: 24px; color: #fff; }
        h1 { font-size: 22px; color: #ffffff; margin: 0 0 8px; }
        p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
        .token-box { background: rgba(15, 22, 41, 0.8); border: 2px dashed rgba(99, 120, 255, 0.4); border-radius: 10px; padding: 16px; text-align: center; margin: 24px 0; }
        .token-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #7b8fff; margin-bottom: 6px; }
        .token-code { font-family: 'Courier New', Courier, monospace; font-size: 20px; font-weight: bold; color: #22d3a5; word-break: break-all; letter-spacing: 1px; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: #3150cf; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo-badge">🛡️</div>
          <h1>Selamat Datang, ${name}!</h1>
          <p>Terima kasih telah mendaftar di SecureTask Portal. Silakan verifikasi email Anda untuk mengaktifkan akun.</p>
        </div>

        <div class="token-box">
          <div class="token-label">Token Verifikasi Anda</div>
          <div class="token-code">${token}</div>
        </div>

        <div class="btn-container">
          <a href="${verificationLink}" class="btn" target="_blank">Aktivasi Akun Sekarang</a>
        </div>

        <p style="font-size: 13px; text-align: center;">Atau salin tautan berikut ke browser Anda:<br>
          <a href="${verificationLink}" style="color: #6378ff; word-break: break-all;">${verificationLink}</a>
        </p>

        <div class="footer">
          Token ini berlaku selama 24 jam. Jika Anda tidak merasa mendaftar di SecureTask Portal, abaikan email ini.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Halo ${name},\n\nTerima kasih telah mendaftar di SecureTask Portal.\nToken verifikasi Anda adalah: ${token}\n\nAtau buka link berikut:\n${verificationLink}\n\nToken berlaku 24 jam.`;

  // Konfigurasi transport nodemailer persis sesuai kredensial Mailtrap
  if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
        port: process.env.MAILTRAP_PORT ? Number(process.env.MAILTRAP_PORT) : 2525,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS,
        },
      });

      const info = await transport.sendMail({
        from,
        to: email,
        subject,
        text,
        html,
      });

      console.log(`✅ [Nodemailer Mailtrap] Email verifikasi berhasil dikirim ke ${email}. MessageId: ${info.messageId}`);
      return { success: true, method: 'nodemailer_mailtrap', messageId: info.messageId };
    } catch (err) {
      console.error(`❌ [Nodemailer Error]:`, err.message);
    }
  }

  // Fallback log saat kredensial Mailtrap belum diisi di .env
  console.log('----------------------------------------------------');
  console.log(`📧 [Mailtrap Dev Notification]`);
  console.log(`To: ${email} (${name})`);
  console.log(`Verification Token: ${token}`);
  console.log(`Verification URL: ${verificationLink}`);
  console.log('----------------------------------------------------');

  return {
    success: true,
    method: 'dev_console',
    previewToken: token,
    verificationLink,
  };
};

module.exports = {
  sendVerificationEmail,
};
