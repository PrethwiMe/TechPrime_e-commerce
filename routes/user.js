var express = require('express');
var router = express.Router();
const userController = require('../controller/userController')

console.log('✅ user route reloaded', new Date().toLocaleTimeString());

/* GET home page. */
router.get('/',userController.renderSignupPage);
//signUP
router.post('/signupData',userController.handleSignup)
//resend otp
//router.get('/resend-otp',)

//loginpage with session
router.get('/login',userController.renderLoginPage)

module.exports = router;
  