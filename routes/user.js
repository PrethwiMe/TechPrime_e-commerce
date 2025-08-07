var express = require('express');
var router = express.Router();
const userController = require('../controller/userController')

console.log('!!!!!@@ user route reloaded', new Date().toLocaleTimeString());

router.get('/',userController.loadHome)

router.get('/signup',userController.renderSignupPage);
//signUP
router.post('/signupData',userController.handleSignup)
//resend otp
router.post('/resend-otp',userController.resendOtp)
//verify otp
router.post('/verify-email',userController.verifyUserOtp)

//loginpage with session
router.get('/login',userController.renderLoginPage)
router.post('/login-req',userController.loginAccess)
//home


module.exports = router;
  