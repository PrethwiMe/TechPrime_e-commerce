const userModel = require('../model/userModel');
const productModel = require('../model/productModels')
const sendMail = require('../utils/mailSend');
const { addressValidation } = require('../utils/validation');
const userProfileModel = require("../model/userProfileModel")
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const upload = require('../middleware/multer');
const { getDB } = require('../config/mongodb');
const { cloudinary } = require('../middleware/cloudinary')
const streamifier = require("streamifier");
const streamUpload = require("../middleware/streamHelper");
const { json } = require('express');
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");


exports.viewProfile = async (req, res) => {

  const userId = req.session.user
  const user = await userModel.fetchUser(userId.email);
  res.render('user-pages/profile.ejs', { user })
}
//add address
exports.addAddress = async (req, res) => {
  const userId = req.session.user.userId
  const { error } = addressValidation(req.body)
  if (error) {
    return res.status(400).json({ message: error.details[0].message })
  }
  const { fullName, phone, line1, city, state, pincode } = req.body;
  const data =
  {
    id: uuidv4(),
    userId,
    fullName,
    phone,
    line1,
    city,
    state,
    pincode,

  }
  let result = await userProfileModel.addAddress(data)
  if (result) return res.status(200).json({ message: "address added successfully" })
}
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
  res.render('user-pages/address.ejs', {
    user: { addresses: address || [] } // 👈 fixed
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
  res.render('user-pages/editUserData.ejs', { user: data })

}
///////////////////////////////////////////////////////////////////////
//image adding
// exports.userImage = async (req, res) => {
//   try {
//     if (!req.file) {
//       console.log("⚠️ No file attached in request");
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     console.log(" File received:", {
//       fieldname: req.file.fieldname,
//       mimetype: req.file.mimetype,
//       size: req.file.size,
//       buffer: req.file.buffer?.length
//     });

//     // Upload to Cloudinary using buffer
//     const result = await streamUpload(req.file.buffer);

//     console.log(" Uploaded to Cloudinary:", result.secure_url);

//     // Save Cloudinary URL in DB
//     await userModel.updateProfileImage(req.session.user.userId, result.secure_url);

//     res.json({ success: true, url: result.secure_url });
//   } catch (err) {
//     console.error(" Cloudinary upload error:", err);
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

  let deliveryCharge = subtotal > 100000 ? 0 : 100;

  let total = subtotal + tax + deliveryCharge;

  const addresses = Array.isArray(data.addresses) ? data.addresses.map(a => a.addresses) : [];


  res.render("user-pages/checkOutPage.ejs", {
    cartItems,
    addresses,
    subtotal,
    tax,
    deliveryCharge,
    total
  });
};

exports.addToOrder = async (req, res) => {

  const order = req.body;
  const { paymentMethod } = req.body;

  if (paymentMethod === "cod") {
    //pass order and userId
      const userId = req.session.user.userId

const result = await userProfileModel.addNewOrder(userId,order);
if(result.acknowledged) return res.status(200).json({ status: "success", message: "OrederPlaced successfully" })
else return res.status(400).json({status:"error",message:"failed please try after sometime"})
  } else {
    res.send("inProgress")
  }
}

exports.viewOrder = async (req,res) => {
  try {
    const userId = req.session.user.userId;
    let data = await userProfileModel.showOrder(userId);
    // console.log(JSON.stringify(data,null,2));
    res.render("user-pages/order.ejs", { orders: data });
  } catch(err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}


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
        .text(`₹${Number(item.price).toLocaleString('en-IN')}`, priceX + 5, y + 5, { align: 'right', width: 50 })
        .text(`₹${(item.quantity * item.price).toLocaleString('en-IN')}`, totalX + 5, y + 5, { align: 'right', width: 60 });

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
      .text(`Tax: ₹${Number(order.tax).toLocaleString('en-IN')}`, 350, totalsTop + 15, { align: 'right' })
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