const cron = require('node-cron');
const { deleteExpiredOtps } = require('../repositories/otpRepository');

/**
 * Menjadwalkan Cron Job untuk membersihkan OTP kedaluwarsa setiap hari pukul 00:00.
 * Pola cron: '0 0 * * *' (menit 0, jam 0, setiap hari)
 */
const startOtpCleanupCron = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('⏰ [Cron Job] Menjalankan pembersihan OTP yang kedaluwarsa...');
      const deletedCount = await deleteExpiredOtps();
      console.log(`✅ [Cron Job] Pembersihan selesai: ${deletedCount} OTP lama berhasil dihapus.`);
    } catch (err) {
      console.error('❌ [Cron Job Error] Gagal membersihkan OTP:', err.message);
    }
  });

  console.log('📅 [Cron Job] Jadwal pembersihan OTP harian aktif (00:00 WIB/lokal).');
};

module.exports = { startOtpCleanupCron };

