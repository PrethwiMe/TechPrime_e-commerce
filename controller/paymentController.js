const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const userProfileModel = require("../model/userProfileModel");
const crypto = require("crypto");
const { updateAddress } = require('./userProfileController');

exports.razorpaySetup = async (req, res) => {
console.log("data for backend",req.body);

  if (!req.session.user) {
    return res.status(401).json({ error: 'Please log in to proceed' });
  }

  let { amount } = req.body
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
 amount = Math.round(amount );

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
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      couponCode
    } = req.body;

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    //  Use session.cart
    const cart = req.session.cart;
    if (!cart || !cart.items.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Fetch order placeholder
    let order = await userProfileModel.showOrderVerify(razorpayOrderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Update order with cart data
    const updateOrder = await userProfileModel.orderUpdate(razorpayOrderId, {
      userId: req.session.user.userId,
      items: cart.items.map(item => ({
        productId: item.product._id,
        variantId: item.variant._id,
        quantity: item.quantity,
        originalPrice: item.originalPrice,
        discountedPrice: item.discountedPrice,
        itemDiscount: item.itemDiscount,
        subtotal: item.itemSubtotal,
        appliedOffer: item.appliedOffer || null,
        itemStatus: "Pending"
      })),
      subtotal: cart.cartSubtotal,
      cartOriginal: cart.cartOriginal,
      cartDiscount: cart.cartDiscount,
      total: cart.cartSubtotal + Number(cart.deliveryCharge || 0) + Number(cart.tax || 0),
      deliveryCharge: cart.deliveryCharge || 0,
      tax: cart.tax || 0,
      couponCode: couponCode || "",
      paymentMethod,
      paymentStatus: "paid",
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      selectedAddress,
      status: "Pending",
      updatedAt: new Date()
    });

    if (updateOrder.modifiedCount > 0) {
      //  Clear cart session after successful order
      req.session.cart = null;
      return res.json({ status: "success" });
    } else {
      return res.status(400).json({ status: "failed" });
    }
  } catch (error) {
    console.log("Error in verifyPayment:", error);
    res.status(500).json({ success: false });
  }
};
