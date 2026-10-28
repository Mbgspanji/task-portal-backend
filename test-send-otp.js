require('dotenv').config();
const { sendOtpEmail } = require('./src/services/emailService');

async function testSend() {
  try {
    console.log('Sending test OTP email...');
    const result = await sendOtpEmail({
      email: process.env.SMTP_USER,
      name: 'Developer Test',
      otp: '789123',
    });
    console.log('Send result:', result);
  } catch (err) {
    console.error('Send error:', err);
  }
}

testSend();

