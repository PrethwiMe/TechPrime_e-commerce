//password hash
const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';
//import model
const dataBaseCall=require('../model/userModel')
const sendMail = require('../utils/mailSend')

//login
exports.renderLoginPage = (req,res) => {
  try {
    res.render('user-pages/login')
  } catch (error) {
    console.log(error)
    res.render('error')
  }
}

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

    // Success: Redirect to dashboard or homepage
    return res.send("ok da mowne")

  } catch (error) {
    console.error('Login error:', error);
    return res.render('user-pages/login', { error: 'Server error. Please try again.' });
  }
};



//signup
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
 let result = await dataBaseCall.insertUser(data)
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

exports.resendOtp = (req,res) => {

}
//top needed to send that is pending
