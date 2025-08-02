//password hash
const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';
//import model
const insertData=require('../model/userModel')
const sendMail = require('../utils/mailSend')


exports.renderSignupPage = (req, res) => {
  res.render('user-pages/signup',{error:null}); 
};


exports.handleSignup = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword, referralCode } = req.body;

    // 🔒 Field Validations
    if (!firstName || !email || !phone || !password || !confirmPassword) {
      return res.render('user-pages/signup', { error: 'All fields except referral code are required.' });
    }

    // 📧 Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('user-pages/signup', { error: 'Invalid email format.' });
    }

    // 📱 Phone Number Validation (simple check, 10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.render('user-pages/signup', { error: 'Phone number must be 10 digits.' });
    }

    // 🔐 Password Strength Check
    if (password.length < 6) {
      return res.render('user-pages/signup', { error: 'Password must be at least 6 characters long.' });
    }

    // 🔁 Confirm Password Match
    if (password !== confirmPassword) {
      return res.render('user-pages/signup', { error: 'Passwords do not match.' });
    }

    // password hash
     const hashedPassword = await bcrypt.hash(password, saltRounds);

    let data={
         firstName, 
         lastName, 
         email, 
         phone, 
         password:hashedPassword,
         role:"user",
         isActive:false,
         createdAt:new Date(),
         address:{
            
         }
         
    }
 let result = await insertData.insertUser(data)
   if (result) {
     const otp = Math.floor(100000 + Math.random() * 900000);
    let msg = await sendMail(email,otp)
    return res.render('user-pages/verify-mail',{error:null});
   }
    
   res.send("please try after some time");
     
  } catch (err) {
    console.error(err);
    return res.status(500).render('error', { error: 'Server error. Please try again.' });
  }
};

