const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const userProfileModel = require("../model/userProfileModel");
const crypto = require("crypto");
const { updateAddress } = require('./userProfileController');
const productModel = require('../model/productModels')
const { Status, Message } = require('../utils/constants')





exports.razorpaySetup = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: "Please log in to proceed" });

    let { amount, selectedAddress, paymentMethod, items, subtotal, deliveryCharge, total, couponCode } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const userId = req.session.user.userId;
    amount = Math.round(amount);
    const currency = "INR";

    let cartOriginal = 0, cartDiscount = 0;
    const updatedItems = items.map(item => {
      const original = item.originalPrice * item.quantity;
      const discounted = (item.discountedPrice || item.originalPrice) * item.quantity;
      const itemDiscount = original - discounted;

      cartOriginal += original;
      cartDiscount += itemDiscount;

      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        originalPrice: item.originalPrice,
        discountedPrice: item.discountedPrice || item.originalPrice,
        itemDiscount,
        subtotal: discounted,
        appliedOffer: !!item.appliedOffer,
      };
    });

    const razorpayOrder = await req.app.locals.razorpay.orders.create({
      amount, currency, receipt: `receipt_${Date.now()}`, notes: { userId }
    });

    const orderData = {
      orderId: `ORD${Math.floor(10000000 + Math.random() * 90000000)}`,
      userId,
      items: updatedItems,
      subtotal: subtotal || cartOriginal - cartDiscount,
      cartOriginal,
      cartDiscount,
      deliveryCharge: deliveryCharge || 0,
      total,
      couponCode: couponCode || "",
      paymentMethod,
      paymentStatus: "pending",
      selectedAddress,
      razorpayOrderId: razorpayOrder.id,
      receipt: razorpayOrder.receipt,
      amount,
      currency,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userProfileModel.addNewOrder(userId, orderData);
    await userProfileModel.deleteCart(userId);
    //disable coupons
    let disableCoupon = await userProfileModel.disableCoupon(couponCode)


    res.status(200).json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      dbOrderId: orderData.orderId,
    });
  } catch (err) {
    console.error(" Razorpay setup error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, dbOrderId } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const order = await userProfileModel.showOrderVerify(dbOrderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const updateOrder = await userProfileModel.orderUpdate(razorpayOrderId, {
      paymentStatus: "paid",
      razorpayPaymentId,
      razorpaySignature,
    });


    for (const item of order.items) {
      const changed = await productModel.updateStockAfterOrder(item.variantId, item.quantity);
    }

    res.json({
      success: updateOrder.modifiedCount > 0,
      message: updateOrder.modifiedCount > 0 ? "Payment verified successfully" : "Payment update failed"
    });
  } catch (err) {
    console.error(" verifyPayment error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
exports.repeatPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!req.session.user) {
      return res.status(401).json({ error: 'Please log in to proceed' });
    }

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const userId = req.session.user.userId;
    const order = await userProfileModel.getOrderByOrderId(userId, orderId);
    if (!order || order.userId.toString() !== userId.toString()) {
      return res.status(404).json({ success: false, error: 'Order not found or unauthorized' });
    }

    if (
      order.status !== 'Pending' ||
      order.paymentMethod !== 'online' ||
      order.paymentStatus !== 'pending'
    ) {
      return res.status(400).json({ success: false, error: 'This order is not eligible for repeat payment' });
    }

    const amount = Math.round(order.total * 100);
    const currency = 'INR';
    const newReceipt = `receipt_repeat_${Date.now()}`;

    const newRazorpayOrder = await req.app.locals.razorpay.orders.create({
      amount,
      currency,
      receipt: newReceipt,
      notes: {
        userId: userId.toString(),
        originalOrderId: order.orderId,
        repeatAttempt: true
      }
    });
    const updateResult = await userProfileModel.updateRetryPaymentOrder(order.razorpayOrderId, {
      retryRazorpayOrderId: newRazorpayOrder.id,
      retryReceipt: newReceipt,
      updatedAt: new Date(),
    });

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({ success: false, error: 'Failed to update order for repeat payment' });
    }

    res.json({
      success: true,
      paymentUrl: `/order/verifyPayment?razorpayOrderId=${newRazorpayOrder.id}`,
      id: newRazorpayOrder.id,
      amount: newRazorpayOrder.amount,
      currency: newRazorpayOrder.currency,
      orderId: order.orderId,
    });

  } catch (error) {
    console.error('Repeat payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate repeat payment' });
  }
};
