const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const userProfileModel = require("../model/userProfileModel");
const crypto = require("crypto");
const { updateAddress } = require('./userProfileController');

exports.razorpaySetup = async (req, res) => {


  if (!req.session.user) {
    return res.status(401).json({ error: 'Please log in to proceed' });
  }

  const { amount } = req.body
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const currency = 'INR';
  const userId = req.session.user.userId;


  const razorpayOrder = await req.app.locals.razorpay.orders.create({
    amount, // in paise
    currency,
    receipt: `receipt_${Date.now()}`,
    notes: { userId },
  });



  const orderData = {
    userId: userId,
    amount, // In paise
    currency,
    paymentStatus: 'created',
    createdAt: new Date(),
    razorpayOrderId: razorpayOrder.id,
    receipt: razorpayOrder.receipt
  };
  let data = await userProfileModel.addNewOrder(userId, orderData);
    const dltCart = await userProfileModel.deleteCart(userId)

  return res.status(200).json({
    id: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
  });

};
//////////////////////////

exports.verifyPayment = async (req, res) => {

  try {

    const {
      selectedAddress,
      paymentMethod,
      items,
      subtotal,
      tax,
      deliveryCharge,
      total,
      couponCode,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

let order = await userProfileModel.showOrderVerify(razorpayOrderId)


if(razorpayOrderId !== order.razorpayOrderId) return res.status(400).json({succss:false})

  let updateOrder = await userProfileModel.orderUpdate(razorpayOrderId,req.body)
  if (updateOrder.modifiedCount>0) {
    return res.json({ status: "success" });  }
} catch (error) {
    console.log(error);
  }
}