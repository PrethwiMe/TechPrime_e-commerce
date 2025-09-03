var express = require('express');
var router = express.Router();
const userController = require('../controller/userController')
const passport = require('../config/passport');
const { isUserLoggedIn, userConfirmed } = require('../middleware/userSession');

console.log('!!!!!@@ user route reloaded', new Date().toLocaleTimeString());

router.get('/',userController.loadHome)

router.get('/signup',isUserLoggedIn,userController.renderSignupPage);
//signUP
router.post('/signupData',userController.handleSignup)
//resend otp
router.post('/resend-otp',userController.resendOtp)
//verify otp
router.post('/verify-email',userController.verifyUserOtp)

//loginpage with session
router.get('/login',isUserLoggedIn,userController.renderLoginPage)
router.post('/login-req',userController.loginAccess)
// load forgot page
router.get("/forgot-password",userController.loadForgotPage)
//getting mail id from user
router.post("/forgot-password",userController.emailOfUser)
//getting otp from user
router.post('/verify-otp',userController.verifyForgotOtp)
// resend otp
router.get('/resendForgetOtp', userController.forgotResend);
//save nwq passsword
router.post('/verify-otp/reset-password',userController.savePassword)
router.get('/auth/google', userController.googleLogin);

// Google callback
router.get('/auth/google/callback',userController.googleCallback,userController.googleSuccessRedirect);

// Logout
router.get('/logout', userController.logoutUser);
//search
router.get('/search', userController.searchProduct);
//  filter + sort + search 
router.post('/search/data',userController.sortAndSearchProducts)
router.get('/all-product/product-details/:id',userController.loadProductDetails)
//add to cart
router.post("/cart/add",userConfirmed,userController.addToCart)
//view cart
router.get('/cart',userConfirmed,userController.viewCart)
//increment or decrement
router.post("/cart/update", userConfirmed,userController.quntityControlCart);
//delete
router.post('/cart/delete',userController.deleteCart)
//whishlist
router.post('/wishlist',userConfirmed,userController.whishList)

module.exports = router;
  