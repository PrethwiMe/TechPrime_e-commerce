const userModel = require('../model/userModel');
const productModel = require('../model/productModels')
const sendMail = require('../utils/mailSend');
const { addressValidation } = require('../utils/validation');
const userProfileModel = require("../model/userProfileModel")
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const upload = require('../middleware/multer')



exports.viewProfile = (req, res) => {

  const userId =  req.session.user
  
    res.render('user-pages/profile.ejs',{user:userId})
}
//add address
exports.addAddress =async (req, res) => {
    const userId = req.session.user.userId
    console.log(userId);
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
        pincode
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
exports.userImage = async (req,res) => {

    console.log(req.file);
    
}
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