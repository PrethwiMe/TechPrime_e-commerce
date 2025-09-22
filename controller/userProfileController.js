const userModel = require('../model/userModel');
const productModel = require('../model/productModels')
const sendMail = require('../utils/mailSend');
const { addressValidation } = require('../utils/validation');
const userProfileModel = require("../model/userProfileModel")
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const upload = require('../middleware/multer');
const { getDB } = require('../config/mongodb');
const {cloudinary} = require('../middleware/cloudinary')
const streamifier = require("streamifier");
const streamUpload = require("../middleware/streamHelper")

exports.viewProfile =async (req, res) => {

  const userId =  req.session.user
      const user = await userModel.fetchUser(userId.email);
    console.log(userId.email,"email");
    console.log(user);
    res.render('user-pages/profile.ejs',{user})
}
//add address
exports.addAddress =async (req, res) => {
    const userId = req.session.user.userId
    console.log(userId);
    console.log(req.body);
    const { error } = addressValidation(req.body)
    if (error) {
        return res.status(400).json({ message: error.details[0].message })
    }
    const { fullName, phone, line1, city, state, pincode } = req.body;
    const data =
    {
        id:uuidv4(),
        userId,
        fullName,
        phone,
        line1,
        city,
        state,
        pincode,
        isActive:true
    }
let result = await  userProfileModel.addAddress(data)
if(result) return res.status(200).json({message:"address added successfully"})
}
exports.viewAdress = async (req,res) => {
let address = await userProfileModel.viewAddress(req.session.user.userId)
res.render('user-pages/address.ejs', {
    user: { addresses: address?.addresses || [] }
});}
//updateAddress
exports.updateAddress = async (req,res) => {
    const userId = req.session.user.userId
    const result = await userProfileModel.updateAddress(userId,req.body)
  if (result.modifiedCount > 0) {
            return res.status(200).json({ message: "Address updated successfully." });
        } else {
            return res.status(400).json({ message: "No changes were made or address not found." });
        }  
}
//viewUserEditpage
exports.viewUserEditpage = async (req,res) => {
  const email =  req.session.user.email

 let data = await userModel.fetchUser(email)
 res.render('user-pages/editUserData.ejs',{user:data})

}
///////////////////////////////////////////////////////////////////////
//image adding
// exports.userImage = async (req, res) => {
//   try {
//     if (!req.file) {
//       console.log("⚠️ No file attached in request");
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     console.log("✅ File received:", {
//       fieldname: req.file.fieldname,
//       mimetype: req.file.mimetype,
//       size: req.file.size,
//       buffer: req.file.buffer?.length
//     });

//     // Upload to Cloudinary using buffer
//     const result = await streamUpload(req.file.buffer);

//     console.log("✅ Uploaded to Cloudinary:", result.secure_url);

//     // Save Cloudinary URL in DB
//     await userModel.updateProfileImage(req.session.user.userId, result.secure_url);

//     res.json({ success: true, url: result.secure_url });
//   } catch (err) {
//     console.error("❌ Cloudinary upload error:", err);
//     res.status(500).json({ message: "Upload failed" });
//   }
// };

////////////////////////////////////////////////////////////////////////
exports.updatePassword = async (req, res) => {
  const { firstName, email, phone, currentPassword, newPassword, confirmPassword } = req.body;
  
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New password and confirmation do not match!" });
  }
  let data = await userModel.fetchUser(email);
  if (!data) {
    return res.status(404).json({ message: "User not found!" });
  }

  const isMatch = await bcrypt.compare(currentPassword, data.password);
    if (!isMatch) {
    return res.status(400).json({ message: "Current password is incorrect!" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updateResult = await userModel.updatePassword(email, hashedPassword);

  if (updateResult.modifiedCount > 0) {
    return res.status(200).json({ message: "Password updated successfully!" });
  } else {
    return res.status(400).json({ message: "Failed to update password." });
  }
};

//check
exports.checkoutView = async (req, res) => {
  const userId = req.session.user.userId;
  let data = await userProfileModel.checkOutView(userId);

  // cartItems is directly the array
  const cartItems = Array.isArray(data.cartItems) ? data.cartItems : [];

  let subtotal = 0;
  cartItems.forEach(item => {
    if (item.variant && item.variant.price) {
      subtotal += item.variant.price * item.quantity;
    }
  });

  // Tax calculation
  let tax = 0;
  if (subtotal > 150000) {
    tax = subtotal * 0.18;
  } else if (subtotal > 100000) {
    tax = subtotal * 0.10;
  } else if (subtotal > 50000) {
    tax = subtotal * 0.05;
  }

  // Delivery
  let deliveryCharge = subtotal > 100000 ? 0 : 100;

  // Final total
  let total = subtotal + tax + deliveryCharge;

  res.render("user-pages/checkOutPage.ejs", {
    cartItems,
    addresses: data.addresses?.[0]?.addresses || [],
    subtotal,
    tax,
    deliveryCharge,
    total
  });
};
