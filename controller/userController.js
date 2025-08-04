const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';
const dataBaseCall = require('../model/userModel');
const sendMail = require('../utils/mailSend');

exports.renderLoginPage = (req, res) => {
  try {
    res.render('user-pages/login');
  } catch (error) {
    console.log(error);
    res.render('error');
  }
};

exports.loginAccess = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('user-pages/login', { error: 'Email and password are required.' });
    }

    const user = await dataBaseCall.fetchUser(email);

    if (!user) {
      return res.render('user-pages/login', { error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('user-pages/login', { error: 'Invalid email or password.' });
    }

    return res.send("ok da mowne");
  } catch (error) {
    console.error('Login error:', error);
    return res.render('user-pages/login', { error: 'Server error. Please try again.' });
  }
};

exports.renderSignupPage = (req, res) => {
  res.render('user-pages/signup', { error: null });
};

exports.handleSignup = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword, referralCode } = req.body;

    if (!firstName || !email || !phone || !password || !confirmPassword) {
      return res.render('user-pages/signup', { error: 'All fields except referral code are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('user-pages/signup', { error: 'Invalid email format.' });
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.render('user-pages/signup', { error: 'Phone number must be 10 digits.' });
    }

    if (password.length < 6) {
      return res.render('user-pages/signup', { error: 'Password must be at least 6 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.render('user-pages/signup', { error: 'Passwords do not match.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const otp = Math.floor(100000 + Math.random() * 900000);
    let data = {
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: "user",
      isActive: true,
      createdAt: new Date(),
      otp,
      otpCreated:new Date(),
      address: {}
    };

    let result = await dataBaseCall.insertUser(data);
    if (result) {
      
      let msg = await sendMail(email, otp);
      return res.render('user-pages/verify-mail', { error: null, userMail:email });
    }

    res.send("please try after some time");
  } catch (err) {
    console.error(err);
    return res.status(500).render('error', { error: 'Server error. Please try again.' });
  }
};

exports.resendOtp =async (req, res) => {
try {
  let mail= req.body.email
  const otp = Math.floor(100000 + Math.random() * 900000);
  console.log("call reached here.......😍");

 let data = await dataBaseCall.resendotpData(mail,otp)
 let msg = await sendMail(mail, otp);
 console.log(data);
 console.log(msg);
    return res.json({ success: true });  
} catch (error) {
   console.log(error);
    return res.status(500).json({ success: false, error: 'Server error' });
}
};
