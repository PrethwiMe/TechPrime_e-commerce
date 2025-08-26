require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.OWNER_MAIL,
    pass: process.env.OWNER_PASS,
  },
});

/**
 * @param {string} toEmail - Recipient email address
 * @param {string} code - Verification/OTP code
 * @param {string} type - "signup" or "forgot"
 */
async function sendVerificationMail(toEmail, code, type) {
  // Define dynamic text
  const isSignup = type === 'signup';
  const subject = isSignup
    ? 'Welcome to TechPrime - Verify Your Email'
    : 'TechPrime - Password  Verification';
  
  const title = isSignup
    ? 'Welcome to TechPrime!'
    : 'Password Reset Request';
  
  const message = isSignup
    ? `Thanks for signing up with <strong>TechPrime</strong>, your trusted laptop store. Please use the verification code below to complete your registration.`
    : `We received a request to reset your password for your <strong>TechPrime</strong> account. Please use the verification code below to proceed.`;

  const mailOptions = {
    from: `TechPrime <${process.env.OWNER_MAIL}>`,
    to: toEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
          <div style="background-color: #1a73e8; color: white; padding: 15px 20px; font-size: 20px; font-weight: bold;">
            TechPrime
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">${title}</h2>
            <p style="font-size: 15px; color: #555;">${message}</p>
            <div style="margin: 20px 0; text-align: center;">
              <span style="display: inline-block; font-size: 32px; letter-spacing: 4px; background: #f1f1f1; padding: 10px 20px; border-radius: 6px; font-weight: bold; color: #1a73e8;">
                ${code}
              </span>
            </div>
            <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes.</p>
            <p style="font-size: 14px; color: #888;">If you did not initiate this request, please ignore this email.</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #aaa;">
            &copy; ${new Date().getFullYear()} TechPrime. All rights reserved.
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(` ${type} email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(' Error sending email:', error);
    return false;
  }
}

module.exports = sendVerificationMail;
