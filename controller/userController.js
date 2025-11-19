const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';
const userModel = require('../model/userModel');
const productModel = require('../model/productModels')
const sendMail = require('../utils/mailSend');
const passport = require('../config/passport');
const paginate = require('../utils/paginate');
const { ObjectId } = require('mongodb');
const joi = require('../utils/validation')
const adminModal = require('../model/adminModel');
const { json } = require('express');
const { Status, Message } = require('../utils/constants')



exports.loadHome = async (req, res) => {
  try {

    const data = await productModel.allProductsDisplay();

    const products = data;
    let filter = {
      isActive:true
    }
    const categories = await productModel.getAllCategories(filter);
      res.render('user-pages/home', {
      products,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Server error loading home page' });
  }
};
exports.renderLoginPage = (req, res) => {
  try {
    
    res.render('user-pages/login', { user: req.session.user });
  } catch (error) {
    console.log(error);
    res.render('error');
  }
};
exports.loginAccess = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { error } = joi.loginValidation({ email, password });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const user = await userModel.fetchUser(email);

    if (user.googleId ) {
      return res.status(400).json({ error: 'Please log in using Google Acount...' });
    }
    console.log("Login attempt for user:", user);  
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account not activated. Please verify your email.' });
    }
    if (user.isActive === "blocked") {
      return res.status(403).json({ error: 'Account is blocked. Please contact support.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.user = {
      userId: user._id,
      firstName: user.firstName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    return res.json({ success: true, redirect: '/' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

exports.renderSignupPage = (req, res) => {
  res.render('user-pages/signup', { error: null });
};
exports.handleSignup = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword, referralCode } = req.body;

    const { error } = joi.signupValidation({
      name: firstName, 
      email,
      phone,
      password,
      confirmPassword
    });

    req.session.emailData = email;

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    //  Check if email already exists
    const data={
      email:email
    }
    const existingUser = await userModel.userCheck(data);
    console.log(existingUser);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please log in or use another email.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const otp = Math.floor(100000 + Math.random() * 900000);

    const newUser = {
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: "user",
      isActive: false,
      createdAt: new Date(),
      otp,
      otpCreated: new Date(),
      referralCode,
      address: {}
    };

    const result = await userModel.insertUser(newUser);

    //referral logic

    if (referralCode) {
      let referr = await userModel.updateRefferal(referralCode)
      console.log("referral Applied")
    }


    if (result) {
      console.log("OTP....!!", otp);
      await sendMail(email, otp, "signup");
      return res.json({
        success: true,
        userMail: email
      });
    }

    return res.status(500).json({
      success: false,
      message: "Please try again later."
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

exports.renderVerifyMailPage = (req, res) => {  
  
  if (!req.session.emailData) return res.redirect('/signup');
email = req.session.emailData;
  res.render('user-pages/verify-mail', { email, error: null })
}


exports.resendOtp = async (req, res) => {
  try {
    let mail = req.body.email
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(otp);

    let data = await userModel.resendotpData(mail, otp)
    let msg = await sendMail(mail, otp,"signup"   );
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};



exports.verifyUserOtp = async (req, res) => {
  //otp from front end
  const { email, otp } = req.body
  //otp from db
  let result = await userModel.userVerify(email)

  console.log("user enterd", otp);
  let numOtp = parseInt(otp)

  if (result.otp == numOtp) {
    await userModel.userActive(email)
    return res.json({ success: true, message: "Success." });
  }

  return res.json({ success: false, message: "Invalid OTP." });



}

//forgot password page loading
exports.loadForgotPage = (req, res) => {
  res.render('user-pages/forgot_page.ejs', { error: null })
}
//otp sendingto mail
exports.emailOfUser = async (req, res) => {

  let user = await userModel.fetchUser(req.body.email);
  if (!user) return res.render('user-pages/forgot_page.ejs', { error: "E-mail is not Found" })
  const otp = Math.floor(100000 + Math.random() * 900000);
  console.log(otp);
  let data = await userModel.resendotpData(user.email, otp)
  let d = await sendMail(user.email, otp, "forgot")
  res.render('user-pages/otpForgot', { email: user.email, err: null })
}
exports.verifyForgotOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.render('user-pages/otpForgot', {
        email,
        err: "Please enter the OTP sent to your email."
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.render('user-pages/otpForgot', {
        email,
        err: "OTP must be a 6-digit number."
      });
    }

    const user = await userModel.fetchUser(email);
    if (!user) {
      return res.render('user-pages/forgot_page', {
        error: "E-mail not found."
      });
    }

    let result = await userModel.userVerify(email)
    console.log("user enterd", otp);
    let numOtp = parseInt(otp)
    if (!otp) {
      return res.render('user-pages/otpForgot', {
        email,
        err: "No OTP found. Please request a new one."
      });
    }

    const expiryTime = result.otpCreated.getTime() + (10 * 60 * 1000);
    if (Date.now() > expiryTime) {
      return res.render('user-pages/otpForgot', {
        email,
        err: "OTP expired. Please request a new one."
      });
    }

    if (numOtp !== result.otp) {
      return res.render('user-pages/otpForgot', {
        email,
        err: "Invalid OTP. Please try again."
      });
    }

    return res.render('user-pages/newPassoword.ejs', { email, err: null, success: null });

  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
};
exports.forgotResend = async (req, res) => {
  try {
    const mail = req.query.email;
    if (!mail) return res.status(400).json({ success: false, error: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log('Generated OTP:', otp);

    await userModel.resendotpData(mail, otp, "signup");
    await sendMail(mail, otp, "forgot");

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
//forgot new password
exports.savePassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.render('user-pages/resetPassword', {
        email,
        err: 'Please fill all required fields.'
      });
    }

    if (password.length < 6) {
      return res.render('user-pages/resetPassword', {
        email,
        err: 'Password must be at least 6 characters.'
      });
    }

    if (password !== confirmPassword) {
      return res.render('user-pages/resetPassword', {
        email,
        err: 'Passwords do not match.'
      });
    }

    const user = await userModel.userVerify(email);
    if (!user) {
      return res.render('user-pages/resetPassword', {
        email,
        err: 'User not found.'
      });
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    await userModel.updatePassword(email, hashedPassword);

    return res.render('user-pages/login', {
      email,
      success: 'Password updated successfully! You can now log in.',
    });

  } catch (error) {
    console.error(error);
    return res.status(500).render('user-pages/resetPassword', {
      email: req.body.email,
      err: 'Server error, please try again later.'
    });
  }
};
// Google login redirect
exports.googleLogin = passport.authenticate('google', { scope: ['profile', 'email'] });
// Google callback
exports.googleCallback = passport.authenticate('google', { failureRedirect: '/login' });
// After successful Google login
exports.googleSuccessRedirect = async (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }
     req.session.user = {
  userId: String(req.user._id),
  firstName: req.user.firstName,
  email: req.user.email,
  role: req.user.role,
};

     console.log('User session set:', req.session.user)
  const data = await productModel.allProductsDisplay();
  const products = data;
  const categories = await productModel.getAllCategories();
res.redirect('/')
};
// Logout
exports.logoutUser = (req, res) => {

  req.logout(() => {
    res.redirect('/');
  });
};
//  Search 
exports.searchProduct = async (req, res) => {

  const searchKey = req.query.searchKey || '';

  try {
    let value = searchKey.trim() || "";

    let limit = 3;
    let query = { isActive: true };

    if (value !== "") {
      query.name = { $regex: value, $options: "i" };
    }

    const products = await productModel.getFilteredProducts(query);
    const categories = await productModel.getAllCategoriesForUser();

    // Pagination
    const page = Number(req.body.page) || 1;
    const totalDocs = products.length;
    const { skip, totalPages } = paginate({ totalDocs, page, limit });
    const paginatedProducts = products.slice(skip, skip + limit);

    res.render("user-pages/allProductsUsers.ejs", {
      products: paginatedProducts,
      query: value,
      categories,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("error");
  }
};
//Sort + Search +Filter 
exports.sortAndSearchProducts = async (req, res) => {
  const searchKey = req.query.searchKey || '';
  try {
    const { sort, searchKey, minPrice, maxPrice, categories } = req.body;
    console.log("categories", categories)
    let query = { isActive: true };

    if (searchKey && searchKey.trim() !== "") {
      query.name = { $regex: searchKey, $options: "i" };
    }

    if (categories && categories.length > 0) {
      query.categoriesId = { $in: categories.map(c => c.trim()) };
    }

        let products = await productModel.getFilteredProducts(query);


   if (minPrice || maxPrice) {
  products = products.filter(p =>
    p.fullProduct.some(v => {
      const price = Number(v.price);
      if (minPrice && price < minPrice) return false;
      if (maxPrice && price > maxPrice) return false;
      return true;
    })
  );
}


  if (sort) {
  switch (sort) {
    case "low-high":
      products.sort((a, b) => a.fullProduct[0].price - b.fullProduct[0].price);
      break;
    case "high-low":
      products.sort((a, b) => b.fullProduct[0].price - a.fullProduct[0].price);
      break;
    case "newest":
      products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }
}


    if (sort === "a-z") products.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "z-a") products.sort((a, b) => b.name.localeCompare(a.name));

    const page = Number(req.body.page) || 1;
    const limit = 3;
    const totalDocs = products.length;
    const { skip, totalPages } = paginate({ totalDocs, page, limit });
    const paginatedProducts = products.slice(skip, skip + limit);

    res.json({
      products: paginatedProducts,
      currentPage: page,
      totalPages,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
exports.loadProductDetails = async (req, res) => {
  let data = req.params.id
  try {
    let result = await productModel.viewProducts(data)
    let categoriesId = result[0].categoriesId   
    const { totalDocs, products } = await productModel.viewAllProducts()

//related products
let filteredProducts = products.filter(product => {
  return product.categoriesId == categoriesId
}  );


    let categories = await productModel.getAllCategories()
    res.render("user-pages/productDetails.ejs", { relatedProducts:filteredProducts,categories, product: result[0], products: products, query: req.query.q || "" });
  } catch (error) {
    console.log(error);
  }
}
//add to carts
exports.addToCart = async (req, res) => {
  try {
  const { productId, variantId, productName } = req.body;

  let deletefromWishlist = await userModel.deleteWishListProduct(req.session.user.userId,productId)

  const Id = req.session.user.userId
  const name = req.session.user.name
  const data = await userModel.addToCartdb(Id, productId, variantId, productName)
  //get category id, cmpre ofer and product offer
  let result = await productModel.viewProducts(productId)
  let categoriesId = result[0]. categoriesId;
  let offerCheck = await adminModal.checkOffers({productId,categoriesId,Active:true})
  if (offerCheck) {
    let updateOffer = await userModel.updateOfferInCart(Id, productId,offerCheck) 
  }
  return res.json(data);
} catch (error) {
  console.error(error);
}

}
//view cart
exports.viewCart = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    let data = await userModel.viewCartData(userId);


    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      req.session.cart = null;
      return res.render("user-pages/cart.ejs", {
        data: null,
        userId,
        cartOriginal: 0,
        cartDiscount: 0,
        cartSubtotal: 0,
      });
    }

    // Save initial cart structure early
    req.session.cart = { userId, items: data.items };

    // OFFER LOGIC START
    const cartWithOffers = await Promise.all(
      data.items.map(async (item) => {
        const productIdStr = item.product._id.toString();
        const categoryIdStr = item.product.category?._id?.toString();

        const [productOffer, categoryOffer] = await Promise.all([
          adminModal.viewOffers({
            Active: true,
            appliesTo: "product",
            productId: productIdStr,
          }),
          adminModal.viewOffers({
            Active: true,
            appliesTo: "category",
            categoryId: categoryIdStr,
          }),
        ]);

        const originalPrice = item.variant.price;
        const productDiscount = productOffer?.Active
          ? productOffer.offerValue || 0
          : 0;
        const categoryDiscount = categoryOffer?.Active
          ? categoryOffer.offerValue || 0
          : 0;

        let appliedOffer = null;
        let discount = 0;

        if (productDiscount >= categoryDiscount && productDiscount > 0) {
          appliedOffer = productOffer;
          discount = productDiscount;
        } else if (categoryDiscount > 0) {
          appliedOffer = categoryOffer;
          discount = categoryDiscount;
        }

        const discountedPrice = Math.max(0, originalPrice - discount);

        return {
          ...item,
          originalPrice,
          discountedPrice,
          appliedOffer,
          itemDiscount: discount,
          itemSubtotal: discountedPrice * item.quantity,
        };
      })
    );

    let cartOriginal = 0;
    let cartDiscount = 0;
    let cartSubtotal = 0;

    cartWithOffers.forEach((item) => {
      cartOriginal += item.originalPrice * item.quantity;
      cartDiscount += item.itemDiscount * item.quantity;
      cartSubtotal += item.itemSubtotal;
    });

    const updatedData = {
      ...data,
      items: cartWithOffers,
      cartOriginal,
      cartDiscount,
      cartSubtotal,
    };

    req.session.cart = {
      userId,
      items: cartWithOffers,
      cartOriginal,
      cartDiscount,
      cartSubtotal,
    };

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    res.render("user-pages/cart.ejs", {
      data: updatedData,
      userId,
      cartOriginal,
      cartDiscount,
      cartSubtotal,
    });
  } catch (error) {
    console.error("Error in viewCart:", error);
    res.status(500).send("Internal Server Error");
  }
};
//cart + -
exports.quntityControlCart = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const { productId, variantId, action } = req.body;

    if (!productId || !variantId || !action) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const result = await userModel.controllCart(userId, productId, variantId, action);

    if (!result) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    res.json({
      success: true,
      message: "Quantity updated",
      item: result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
//remove product
exports.deleteCart = async (req, res) => {
  try {
    const { productId, variantId, userId } = req.body;
    const result = await userModel.removeProduct(productId, variantId, userId);
    if (result.modifiedCount > 0) {
      return res.json({ success: true, message: "Item removed" });
    }
    return res.json({ success: false, message: "Item not found in cart" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// 
exports.whishList = async (req, res) => {
  try {
    const userId = req.session?.user?.userId;
    if (!userId) {
      return res.json({ success: false, loginRequired: true, message: "Login required" });
    }
    const { productId, productName } = req.body;
    const response = await userModel.addToWhishList(userId, productId, productName);
    if (response === "data is there") {
      return res.json({ success: false, message: "Already in Wishlist" });
    }
    res.json({ success: true, message: "Product added to wishlist!" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error, try again later" });
  }
};
////view whishList
exports.whishListCall = async (req,res) => {
  const id = req.session.user.userId
  let wishlist = await userModel.viewWishList(id);
  res.render('user-pages/whishlist.ejs',{wishlist})
}
//delete from wishlist
exports.deleteWishList = async (req, res) => {
try {
  const userId = req.session.user.userId;
  const{  productId } = req.body;
  let result = await userModel.deleteWishListProduct(userId,productId)

  if (result.modifiedCount > 0) {
    return  res.json({ success: true, message: "product deleted from wishlist..!" });
  }
} catch (error) {
  console.log(error);
  res.status(500).json({ success: false, message: "product can not delete now..!" });
}

}

