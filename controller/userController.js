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

exports.loadHome = async (req, res) => {
  try {

    const data = await productModel.allProductsDisplay();
    const products = data;
// data.forEach(element => {
//   console.log(element);
  
// }); 
   const categories = await productModel.getAllCategories();
    res.render('user-pages/home', {
      user: req.session.user || null,
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
      return res.render('user-pages/login', { error: error.details[0].message });
    }

    const user = await userModel.fetchUser(email);

    console.log(user);

    if (!user) {
      return res.render('user-pages/login', { error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('user-pages/login', { error: 'Invalid email or password.' });
    }

    req.session.user = {
      userId: user._id,
      firstName: user.firstName,
      email: user.email,
      phone: user.phone,
      role: user.role
    };

    return res.redirect('/');
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

    const { error } = joi.signupValidation({
      name: firstName, // mapping to schema
      email,
      phone,
      password,
      confirmPassword
    });

    if (error) {
      return res.render('user-pages/signup', { error: error.details[0].message });
    }

    //  Check if email already exists
    const existingUser = await userModel.fetchUser(email);
    if (existingUser) {
      return res.render('user-pages/signup', { error: 'Email is already registered. Please log in or use another email.' });
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

    if (result) {
      console.log("OTP....!!", otp);
      await sendMail(email, otp, "signup");
      return res.render('user-pages/verify-mail', { error: null, userMail: email });
    }

    res.send("Please try again later.");
  } catch (err) {
    console.error(err);
    return res.status(500).render('error', { error: 'Server error. Please try again.' });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    let mail = req.body.email
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(otp);

    let data = await userModel.resendotpData(mail, otp, "")
    let msg = await sendMail(mail, otp);
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
    console.log("inside if");
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
    console.log("sucsss");

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
   const data = await productModel.allProductsDisplay();
    const products = data;
    const categories = await productModel.getAllCategories();
  res.render('user-pages/home', { user: req.user,products,categories });
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

   console.log(searchKey);
  try {
    let value = searchKey.trim() || "";
    console.log(value, "value");

    let limit = 4;
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
    let query = { isActive: true };

    if (searchKey && searchKey.trim() !== "") {
      query.name = { $regex: searchKey, $options: "i" };
    }

    if (categories && categories.length > 0) {
      query.catagoriesId = { $in: categories.map(c => c.trim()) };
    }

    if (minPrice || maxPrice) {
      query.originalPrice = {};
      if (minPrice) query.originalPrice.$gte = Number(minPrice);
      if (maxPrice) query.originalPrice.$lte = Number(maxPrice);
    }

    let products = await productModel.getFilteredProducts(query);

    if (sort === "low-high") products.sort((a, b) => a.originalPrice - b.originalPrice);
    if (sort === "high-low") products.sort((a, b) => b.originalPrice - a.originalPrice);
    if (sort === "newest") products = products.reverse();

    if (sort === "a-z") products.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "z-a") products.sort((a, b) => b.name.localeCompare(a.name));

    const page = Number(req.body.page) || 1;
    const limit = 4;
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
    console.log(result[0]);
    const { totalDocs, products } = await productModel.viewAllProducts()
    let categories = await productModel.getAllCategories()
    res.render("user-pages/productDetails.ejs", { categories, product: result[0], products: products, query: req.query.q || "" });
  } catch (error) {
    console.log(error);
  }
}
//add to carts

exports.addToCart = async (req,res) => {  
  
if (!req.session.user) {
  return res.status(401).json({ success: false, loginRequired: true, message: "Please login to TechPrime" });
}
    console.log(req.body);
   const { productId, variantId,productName } = req.body;
const Id = req.session.user.userId
const name = req.session.user.name
const data =await userModel.addToCartdb(Id,productId,variantId,productName)
console.log(data);
return res.json(data);

  
}
//view cart
exports.viewCart = async (req,res) => {
let userId = req.session.user.userId
console.log("user",userId);

  let data = await userModel.viewCartData(userId);
// console.log(data);
// console.log(data[0]);
  data[0].items.forEach(item => {
    console.log(item.variantId);
  });


  res.render('user-pages/cart.ejs',{data})
}