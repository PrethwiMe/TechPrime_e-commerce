const userModel = require('../model/userModel');
const productModel = require('../model/productModels')
const sendMail = require('../utils/mailSend');
const { addressValidation } = require('../utils/validation');
const userProfileModel = require("../model/userProfileModel")
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const upload = require('../middleware/multer');
const { getDB } = require('../config/mongodb');
const { cloudinary, uploadToCloudinary } = require('../middleware/cloudinary')
const streamifier = require("streamifier");
const { json } = require('express');
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const { fail } = require('assert');
const { error } = require('console');
const joi = require('../utils/validation')
const { ObjectId } = require("mongodb");
const adminModal = require('../model/adminModel');
const dbVariables = require('../config/databse')
const { handleWalletPayment } = require("../utils/walletUtils");
const { cancelOrderUtils } = require("../utils/cancelUtils");
const crypto = require('crypto');
const axios = require("axios");
const { Status, Message } = require('../utils/constants')

let countOfCoupon = 0;

exports.viewProfile = async (req, res) => {
  const userId = req.session.user
  const user = await userModel.fetchUser(userId.email);

  if (req.session.user) {
    const id = req.session.user.userId
    const query = {
      _id: new ObjectId(id)
    }
    let data = await userModel.userCheck(query)

    return res.render('user-pages/profile.ejs', {
      user, image: data || null
    })
  }

  res.render('user-pages/profile.ejs', { user, image: null });
}


exports.addAddress = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const { error } = addressValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { fullName, phone, line1, city, state, pincode } = req.body;

    const data = {
      id: uuidv4(),
      userId,
      fullName,
      phone,
      line1,
      city,
      state,
      pincode,
    };

    const result = await userProfileModel.addAddress(data);
    if (!result) {
      return res.status(500).json({ message: "Failed to add address." });
    }

    return res.status(200).json({ message: "Address added successfully and validated." });
  } catch (err) {
    console.error("Error adding address:", err.message);
    return res.status(500).json({ message: "Server error while adding address." });
  }
};

//deleteAddress address remove
exports.deleteAddress = async (req, res) => {
  try {

    let result = await userProfileModel.deleteAddress(req.body);

    if (result.modifiedCount > 0) {
      return res.status(200).json({ message: "Deleted address successfully" });
    }

    return res.status(400).json({ message: "Some error occurred while processing" });
  } catch (error) {
    console.error("Error in deleteAddress:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
//view address
exports.viewAdress = async (req, res) => {
  let address = await userProfileModel.viewAddress(req.session.user.userId)
  if (req.session.user) {
    const id = req.session.user.userId
    const query = {
      _id: new ObjectId(id)
    }
    let data = await userModel.userCheck(query)
    return res.render('user-pages/address.ejs', {
      user: { addresses: address || [] }, image: data || null
    })
  }
  res.render('user-pages/address.ejs', {
    user: { addresses: address || [] }
  })
}
//updateAddress
exports.updateAddress = async (req, res) => {
  const userId = req.session.user.userId
  const result = await userProfileModel.updateAddress(userId, req.body)
  if (result.modifiedCount > 0) {
    return res.status(200).json({ message: "Address updated successfully." });
  } else {
    return res.status(400).json({ message: "No changes were made or address not found." });
  }
}
//viewUserEditpage
exports.viewUserEditpage = async (req, res) => {
  const email = req.session.user.email

  let data = await userModel.fetchUser(email)

  console.log(data);
  res.render('user-pages/editUserData.ejs', {
    user: data || null,
    image: data || null
  });

}
//for verification sending email
exports.emailVerificetion = async (req, res) => {
  const mail = req.body.email
  console.log(mail);
  const userdata = await userModel.fetchUser(mail);

  if (userdata) {
    return res.status(400).json({ error: fail, message: "mail alredy exists" })
  }
  const email = req.body.email
  const userId = req.session.user.userId;
  let otp = Math.floor(100000 + Math.random() * 900000).toString();
  let updateOtp = await userProfileModel.newOtp(otp, userId, email)

  let sendotp = await sendMail(mail, otp, "emailChange")
  console.log("otp", otp);
  if (updateOtp && otp && sendotp) {
    return res.status(200).json({ success: true, message: "otp send successfully" })
  } else {
    return res.status(400).json({ success: false, message: "some error" })

  }
}
//verify the mail
exports.verifyEmailOtp = async (req, res) => {
  console.log(req.body);
  const { email, otp, id } = req.body;
  let response = await userModel.userDataEmailVerification(id);

  if (response.otp === otp) {
    const upadateEmail = await userModel.updateEmail(id, email)
    req.session.user.email = email
    if (upadateEmail) {
      res.status(200).json({ success: true, message: "email changed" })
    }
  } else {
    return res.status(400).json({ success: false, message: "error" })
  }

}
//image adding
exports.userImage = async (req, res) => {
  try {
    const { error } = joi.userProfileValidation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((err) => err.message),
      });
    }

    const { firstName, lastName, phone, id } = req.body;
    let updateData = { firstName, lastName, phone, id };


    if (req.file && req.file.buffer) {
      const result = await uploadToCloudinary(req.file.buffer);
      const { public_id, secure_url, created_at } = result;

      updateData.profileImage = {
        public_id,
        url: secure_url,
        uploadedAt: created_at,
      };
    } else {
      const db = await getDB();
      const existingUser = await db.collection(dbVariables.userCollection).findOne({ _id: new ObjectId(id) });
      if (existingUser && existingUser.profileImage) {
        updateData.profileImage = existingUser.profileImage;
      }
    }

    const updateProfile = await userProfileModel.updateUser(updateData);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: updateProfile,
    });
  } catch (error) {
    console.error(" Error in userImage:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
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

  countOfCoupon = 0

  try {
    const userId = req.session.user.userId;

    const data = await userProfileModel.checkOutView(userId);
    const cartItems = Array.isArray(data.cartItems) ? data.cartItems : [];


    if (!cartItems || cartItems.length === 0) {
      return res.redirect("/cart");
    }

    let subtotal = 0;
    let totalDiscount = 0;
    cartItems.forEach((item) => {
      const unitPrice = item.variant.price;
      const unitDiscount = item.offerValue || 0;
      item.originalPrice = unitPrice;
      item.discountedPrice = unitPrice - unitDiscount;
      item.appliedOffer = unitDiscount > 0;
      subtotal += unitPrice * item.quantity;
      totalDiscount += unitDiscount * item.quantity;
    });

    const netSubtotal = subtotal - totalDiscount;

    console.log("netSubtotal", netSubtotal)
    console.log("subtotal", subtotal)
    console.log("totalDiscount", totalDiscount)


    let deliveryCharge = netSubtotal > 100000 ? 0 : 100;

    let total = netSubtotal + deliveryCharge;

    const addresses = Array.isArray(data.addresses)
      ? data.addresses.map((a) => a.addresses)
      : [];

    let coupons = await adminModal.viewCouponPage();

    res.render("user-pages/checkOutPage.ejs", {
      cartItems,
      addresses,
      subtotal,
      totalDiscount,
      deliveryCharge,
      total,
      coupon: coupons || []
    });

  } catch (error) {
    console.error("Error in checkoutView:", error);
    res.status(500).send("Internal Server Error");
  }
};
//add to order

exports.addToOrder = async (req, res) => {
  console.log("request body:", req.body);
  try {
    const { paymentMethod, selectedAddress, couponCode, items } = req.body;
    const userId = req.session.user?.userId;
    if (!userId) return res.status(401).json({ status: "error", message: "Login required" });

    if (paymentMethod == "razorpay") {
      return res.status(400).json({ status: "error", message: "Only COD supported for now" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: "error", message: "No items to order" });
    }

    let subtotal = 0, cartOriginal = 0, cartDiscount = 0;
    const orderItems = items.map(item => {
      const original = +item.originalPrice || 0;
      const discount = +item.discountedPrice || original;
      const quantity = +item.quantity || 1;
      const itemDiscount = original - discount;
      const sub = discount * quantity;

      subtotal += sub;
      cartOriginal += original * quantity;
      cartDiscount += itemDiscount * quantity;

      return                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  {
        productId: item.productId,
        variantId: item.variantId,
        quantity,
        originalPrice: original,
        discountedPrice: discount,
        itemDiscount,
        subtotal: sub,
        appliedOffer: !!item.appliedOffer,
        itemStatus: "Pending",
      };
    });


    const deliveryCharge = subtotal > 100000 ? 0 : 100;
    const total = subtotal + deliveryCharge;

    let orderData = {
      userId,
      items: orderItems,
      subtotal,
      cartOriginal,
      cartDiscount,
      deliveryCharge,
      total,
      couponCode: couponCode || "",
      paymentMethod,
      paymentStatus: false,
      selectedAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (paymentMethod === "wallet") {
      const walletResult = await handleWalletPayment(userId, total);
      if (!walletResult.success) {
        return res.status(400).json({ status: "error", message: walletResult.message });
      }

      orderData.paymentStatus = "paid";
      orderData.paymentMethod = "wallet";
    }

    const result = await userProfileModel.addNewOrder(userId, orderData);
    if (!result.acknowledged) {
      return res.status(400).json({ status: "error", message: "Failed to place order" });
    }

    await userProfileModel.deleteCart(userId);

    for (const item of orderItems) {
      await productModel.updateStockAfterOrder(item.variantId, item.quantity);
    }

    res.status(200).json({
      status: "success",
      message: "Order placed successfully",
      orderSummary: { subtotal, cartOriginal, cartDiscount, deliveryCharge, total }
    });

  } catch (error) {
    console.error("addToOrder error:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

// view order user
exports.viewOrder = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    let data = await userProfileModel.showOrder(userId);
    user = req.session.user
    //for image
    if (req.session.user) {
      const id = req.session.user.userId
      const query = {
        _id: new ObjectId(id)
      }
      let imagedata = await userModel.userCheck(query)
      return res.render("user-pages/order.ejs", {
        orders: data, user, image: imagedata || null
      })
    }

    res.render("user-pages/order.ejs", { orders: data, user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}
exports.eachOrderData = async (req, res) => {
  const orderId = req.query.orderId

  let response = await productModel.eachOrderData(orderId)


  const id = req.session.user.userId
  const query = {
    _id: new ObjectId(id)
  }
  let imagedata = await userModel.userCheck(query)

  res.render('user-pages/order-details.ejs', { image: imagedata, order: response })
}
//return status page
exports.returnStatus = async (req, res) => {
  console.log("params", req.params);
  const userId = req.session.user.userId;
  const orderId = req.params.orderId;
  console.log("userId", userId, " orderId", orderId);
  let data = await userProfileModel.returnStatusData(userId, orderId);
  res.render('user-pages/return-status.ejs', { returnData: data || null });
}
//to download the pdf
exports.invoice = async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const orderId = req.params;
    let data = await userProfileModel.invoiceData(userId, orderId);
    if (!data || !data.order) {
      return res.status(404).send("Invoice data not found");
    }

    const { buyer, order } = data;

    const invoicesDir = path.join(__dirname, '../invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const doc = new PDFDocument({
      margin: 30,
      size: 'A4',
      info: {
        Title: `Invoice ${order.orderId}`,
        Author: 'TechPrime',
        Subject: 'Invoice',
        Creator: 'TechPrime E-commerce'
      }
    });

    const invoicePath = path.join(
      __dirname,
      `../invoices/invoice-${order.orderId}.pdf`
    );
    const stream = fs.createWriteStream(invoicePath);
    doc.pipe(stream);
    doc.pipe(res);


    doc.registerFont('Helvetica', 'Helvetica');
    doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');
    doc.registerFont('Helvetica-Oblique', 'Helvetica-Oblique');


    doc
      .fillColor('#1e3a8a')
      .rect(0, 0, doc.page.width, 80)
      .fill();

    -
      doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('TechPrime', 40, 20)
        .font('Helvetica')
        .fontSize(10)
        .text('E-commerce Solutions', 40, 45)
        .text('123 Business St, Tech City, TC 12345 | support@techprime.com', 40, 60);


    doc
      .fillColor('black')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(`Invoice #${order.orderId}`, 350, 20, { align: 'right' })
      .font('Helvetica')
      .fontSize(10)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 350, 40, { align: 'right' })
      .text(`Due Date: ${new Date(order.createdAt).toLocaleDateString()}`, 350, 55, { align: 'right' });


    doc
      .fontSize(50)
      .fillColor('rgba(0, 0, 0, 0.1)')
      .text('TechPrime', doc.page.width / 2 - 80, doc.page.height / 2 - 40, {
        align: 'center',
        rotate: -45
      });

    doc
      .fillColor('black')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Billed To:', 40, 100, { underline: true });
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(`${buyer.firstName} ${buyer.lastName}`, 40, 115)
      .text(buyer.email, 40, 130)
      .text(buyer.phone, 40, 145);

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Shipping Address:', 300, 100, { underline: true });
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(order.selectedAddress.fullName, 300, 115)
      .text(order.selectedAddress.line1, 300, 130)
      .text(
        `${order.selectedAddress.city}, ${order.selectedAddress.state} - ${order.selectedAddress.pincode}`,
        300,
        145
      )
      .text(`Phone: ${order.selectedAddress.phone}`, 300, 160);

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('black')
      .text('Order Summary:', 40, 190, { underline: true });

    const tableTop = 210;
    const itemX = 40,
      descX = 140,
      qtyX = 340,
      priceX = 400,
      totalX = 460;
    const rowHeight = 20;
    const tableWidth = totalX + 60 - itemX;

    doc
      .fillColor('#e5e7eb')
      .rect(itemX, tableTop, tableWidth, rowHeight)
      .fill();

    doc
      .fillColor('black')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Item', itemX + 5, tableTop + 5)
      .text('Description', descX + 5, tableTop + 5)
      .text('Qty', qtyX + 5, tableTop + 5)
      .text('Price', priceX + 5, tableTop + 5)
      .text('Total', totalX + 5, tableTop + 5);

    doc
      .lineWidth(1)
      .strokeColor('#d1d5db')
      .rect(itemX, tableTop, tableWidth, rowHeight)
      .stroke();

    let i = 0;
    order.items.forEach((item, index) => {
      const y = tableTop + (i + 1) * rowHeight;
      // Alternating row colors
      if (index % 2 === 0) {
        doc
          .fillColor('#f9fafb')
          .rect(itemX, y, tableWidth, rowHeight)
          .fill();
      }
      doc
        .fillColor('black')
        .font('Helvetica')
        .fontSize(9)
        .text(item.productName, itemX + 5, y + 5, { width: 90, ellipsis: true })
        .text(`${item.processor} / ${item.ram} / ${item.storage}`, descX + 5, y + 5, { width: 190, ellipsis: true })
        .text(item.quantity, qtyX + 5, y + 5, { align: 'center', width: 50 })
        .text(`₹${Number(item.variantPrice).toLocaleString('en-IN')}`, priceX + 5, y + 5, { align: 'right', width: 50 })
        .text(`₹${(item.quantity * item.variantPrice).toLocaleString('en-IN')}`, totalX + 5, y + 5, { align: 'right', width: 60 });

      doc
        .rect(itemX, y, tableWidth, rowHeight)
        .stroke();
      i++;
    });

    [itemX, descX, qtyX, priceX, totalX, totalX + 60].forEach((x) => {
      doc
        .moveTo(x, tableTop)
        .lineTo(x, tableTop + (i + 1) * rowHeight)
        .stroke();
    });

    const totalsTop = tableTop + (i + 1) * rowHeight + 10;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('black')
      .text(`Subtotal: ₹${Number(order.subtotal).toLocaleString('en-IN')}`, 350, totalsTop, { align: 'right' })
      .text(`Delivery: ₹${Number(order.deliveryCharge).toLocaleString('en-IN')}`, 350, totalsTop + 30, { align: 'right' })
      .text(`Grand Total: ₹${Number(order.total).toLocaleString('en-IN')}`, 350, totalsTop + 45, { align: 'right' });

    doc
      .lineWidth(1)
      .strokeColor('#d1d5db')
      .rect(350, totalsTop - 5, 175, 65)
      .stroke();

    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor('#4b5563')
      .text('Thank you for shopping with TechPrime!', 40, doc.page.height - 60, { align: 'center' })
      .text('support@techprime.com | +91 123 456 7890', 40, doc.page.height - 45, { align: 'center' });

    doc
      .lineWidth(1)
      .strokeColor('#1e3a8a')
      .rect(15, 15, doc.page.width - 30, doc.page.height - 30)
      .stroke();

    doc.end();

    stream.on("finish", () => {
      console.log("Invoice saved:", invoicePath);
    });
  } catch (error) {
    console.error("Invoice error:", error);
    res.status(500).send("Error generating invoice");
  }
};
//cancel order
exports.cancelOrder = async (req, res) => {
  try {
    console.log("Cancel order body:", req.body);

    const result = await cancelOrderUtils(req);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Order items cancelled successfully",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to cancel order",
    });
  } catch (err) {
    console.error("Error in cancelOrder:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error during cancellation",
    });
  }
};


//return order
exports.returnOrder = async (req, res) => {
  console.log(req.body);
  let data = await userProfileModel.returnData(req.body)
  // update change all products to pending state

  if (data) return res.status(200).json({ success: true, message: "return requsted waiting for approvel" })
  else
    return res.status(400).json({ success: false, message: "return requst not complete" })
}
//cancel item
exports.cancelItem = async (req, res) => {
  try {
    const response = await cancelOrderUtils(req);

    if (response) {
      return res.status(200).json({ success: true, message: "Item cancelled successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Cancellation failed" });
    }
  } catch (err) {
    console.error("Error in cancelItem controller:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.couponLogic = async (req, res) => {
  try {

    if (countOfCoupon == 1) return res.json({ success: false, message: "coupon already appliedd...!" });
 
    const { code, subtotal, items } = req.body;
    const subTotalNum = Number(subtotal) || 0;

    const coupon = await userProfileModel.checkCoupon(code);
    if (!coupon || !coupon.isActive) {
      return res.json({ success: false, message: "Invalid or inactive coupon" });
    }

    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);

    if (now < validFrom || now > validUntil) {
      return res.json({ success: false, message: "Coupon expired or not yet active" });
    }

    if (subTotalNum < coupon.minimumPurchase) {
      return res.json({
        success: false,
        message: `Minimum purchase of ₹${coupon.minimumPurchase} required for this coupon`,
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = Math.floor((subTotalNum * coupon.discount) / 100);
    } else if (coupon.discountType === "flat") {
      discountAmount = coupon.discount;
    }

    const newSubtotal = subTotalNum - discountAmount;



    const deliveryCharge = newSubtotal > 100000 ? 0 : 100;

    const total = newSubtotal + deliveryCharge;
    //prevent multiple clicks
countOfCoupon = 1

    //disable coupons
    let disableCoupon = await userProfileModel.disableCoupon(code)

    const updatedItems = items.map((item) => {
      const discountedPrice =
        coupon.discountType === "percentage"
          ? item.price - (item.price * coupon.discount) / 100
          : item.price - coupon.discount / items.length;


      return {
        ...item,
        appliedOffer: true,
        discountedPrice: Math.max(0, Math.floor(discountedPrice)), // no negative values
      };
    });
    return res.json({
      success: true,
      message: "Coupon applied successfully",
      discount: discountAmount,
      discountedSubtotal: newSubtotal,
      deliveryCharge,
      discountedTotal: Math.floor(total),
      updatedItems,
    });
  } catch (err) {
    console.error("Error in couponLogic:", err);
    return res.status(500).json({ success: false, message: "Server error applying coupon" });
  }
};

exports.returnItem = async (req, res) => {
  const orderData = req.body;

  let checkForReturn = await userProfileModel.checkReturnItem(orderData)
  if (checkForReturn) return res.status(400).json({ success: false, message: "You have already requested a return for this item." })
  const response = await userProfileModel.returnEachItems(orderData)
  if (response) {
    return res.status(200).json({ success: true, message: "Return request submitted successfully." })
  } else {
    return res.status(400).json({ success: false, message: "Failed to submit return request." })
  }
}
//view wallet
exports.viewWallet = async (req, res) => {
  const userId = req.session.user.userId;

  try {
    const page = parseInt(req.query.page) || 1;   // default page = 1
    const limit = 4;                              // items per page (change as needed)
    const skip = (page - 1) * limit;

    let data = await userModel.userCheck({ _id: new ObjectId(userId) });
    const walletData = await userProfileModel.getWalletData(userId);
    if (!walletData || walletData.length === 0) {
      return res.render('user-pages/wallet.ejs', {
        wallet: null,
        refundHistory: [],
        currentPage: page,
        totalPages: 0,
        image: data,
        user: data
      });
    }

    const history = walletData[0].refundHistory || [];
    const walletHistory = walletData[0].walletHistory || [];

    let fullRefundHistory = [...history, ...walletHistory]
fullRefundHistory = fullRefundHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    const paginatedRefunds = fullRefundHistory.slice(skip, skip + limit);
    res.render('user-pages/wallet.ejs', {
      wallet: walletData[0],
      refundHistory: paginatedRefunds,
      currentPage: page,
      totalPages: Math.ceil(fullRefundHistory.length / limit),
      image: data,
      user: data
    });

  } catch (error) {
    console.error("Error in viewWallet:", error);
    res.status(500).send("Internal Server Error");
  }
}

exports.referrals = async (req, res) => {
  let userId = req.session.user.userId

  let data = await userModel.userCheck({ _id: new ObjectId(userId) })
  let dataForReferral = await userModel.getReferral(userId)
  res.render('user-pages/referal.ejs', { image: data || null, user: data || null, data: dataForReferral || [] });
}

exports.genarateReferralCode = async (req, res) => {
  const length = 8;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let userId = req.session.user.userId
  console.log("Referral code generated:", code);
  const updateResult = await userProfileModel.updateReferralInDb(code, userId);

  res.json({ success: true, referralCode: code, dbUpdate: updateResult });
};

exports.couponPage = async (req,res) => {
  let data = await userProfileModel.getCoupon()
  console.log(data)
   res.render('user-pages/coupons.ejs',{coupons : data})
}

