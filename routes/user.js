var express = require('express');
var router = express.Router();
const userController = require('../controller/userController')

console.log('✅ user route reloaded', new Date().toLocaleTimeString());

/* GET home page. */
router.get('/',userController.renderSignupPage);
//signUP
router.post('/signupData',userController.handleSignup)
//resend otp


module.exports = router;
  