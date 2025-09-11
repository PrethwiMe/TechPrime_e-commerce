const userModel = require('../model/userModel');
const productModel = require('../model/productModels')
const sendMail = require('../utils/mailSend');
const { addressValidation } = require('../utils/validation');
const userProfileModel = require("../model/userProfileModel")
const { v4: uuidv4 } = require('uuid');



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