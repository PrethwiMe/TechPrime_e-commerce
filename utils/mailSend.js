require('dotenv').config();

// utils/mailer.js
const nodemailer = require('nodemailer');

// Transporter using Gmail (or your SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.OWNER_MAIL,     // your email
    pass: process.env.OWNER_PASS,        // ⚠️ Gmail app password (not normal login)
  },
});



async function sendVerificationMail(toEmail, code) {
  const mailOptions = {
    from:process.env.OWNER_MAIL ,
    to: toEmail,
    subject: 'Your TechPrime Verification Code',
    html: `
      <div style="font-family:sans-serif;">
        <h2>Verify Your Email</h2>
        <p>Your verification code is:</p>
        <h1 style="color:#4CAF50;">${code}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to', toEmail);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

module.exports = sendVerificationMail;
