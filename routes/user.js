var express = require('express');
var router = express.Router();
const userController = require('../controller/userController')
const passport = require('../config/passport');
const { isUserLoggedIn, userConfirmed } = require('../middleware/userSession');
const userProfileController = require('../controller/userProfileController')
const upload = require('../middleware/multer')
const {uploadUser} = require('../middleware/cloudinary')


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
router.get('/viewWishList',userConfirmed,userController.whishListCall)

//account settings account
router.get('/account',userConfirmed,userProfileController.viewProfile)
//view address
router.get("/account/address",userConfirmed,userProfileController.viewAdress)
//add adress
router.post('/account/addAddress',userConfirmed,userProfileController.addAddress)
//del address
router.post('/account/deleteAddress',userConfirmed,userProfileController.deleteAddress)
//update address 
router.post('/account/editAddress',userConfirmed,userProfileController.updateAddress)
//edit details
router.get('/account/edit',userConfirmed,userProfileController.viewUserEditpage)
//  image  pending user profile
//router.post('/account/uploadImage',uploadUser.single('profileImage'),userProfileController.userImage);

//update password
router.post('/account/updatePassword',userConfirmed,userProfileController.updatePassword)
//checkOut
router.get('/cart/checkout',userConfirmed,userProfileController.checkoutView)
//order page
router.post('/cart/checkout/order',userConfirmed,userProfileController.addToOrder)
//view Order
router.get('/account/orders',userConfirmed,userProfileController.viewOrder)

module.exports = router;
  