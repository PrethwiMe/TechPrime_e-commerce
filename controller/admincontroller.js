const adminModel = require('../model/adminModel')
//hasing modules
const bcrypt = require('bcrypt');
const paginate = require('../utils/paginate');
const productModel = require('../model/productModels');
const { offerValidation, couponValidation } = require('../utils/validation')
const ExcelJS = require("exceljs");


// clear-require-cache.js
Object.keys(require.cache).forEach(function (key) {
  if (key.includes('controller') || key.includes('model')) {
    delete require.cache[key];
  }
});
//load adminpage
exports.sentAdminPage = (req, res) => {
  res.render('admin-pages/login', { error: null, success: false })
}
//adminLogin
exports.loginfunction = async (req, res) => {
  try {

    const { email, password } = req.body;
    let data = await adminModel.adminLogin(email)
    console.log(data);

    if (!data) {
      return res.render('admin-pages/login', { error: "You are Not authorised....!!" })
    }
    //decrypt password
    bcrypt.compare(password, data.password, function (err, result) {

      if (err) {
        console.error(err);
        return res.render('admin-pages/login', { error: "somthing wromg" })
      }
      if (result) {
        req.session.admin = {
          id: data._id,
          name: data.firstName,
          email: data.email
        }
        console.log("sessiondata", req.session.admin);
        return res.redirect("/admin/dashboard");
      }

      res.render("admin-pages/login", { error: "Invalid credentials", success: false });
    });

  } catch (error) {
    console.log(error)
    return res.status(500).render('error', { error: 'Server error. Please try again.' });

  }

};
//viewDashboard  after Login
exports.dashBoardHandle = async (req, res) => {

  let toatlUsers = await adminModel.userDataFetch()
  let userCount = toatlUsers.length
  const ordersData = await adminModel.viewOrders();
  let orders = ordersData.ordersWithDetails.length
  let totalData = ordersData.ordersWithDetails;

  const totalSales = totalData.filter(items => items.status.toLowerCase() === 'delivered').reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = totalData.filter(items => items.status.toLowerCase() === 'pending').length
  console.log("total sales", totalSales);
  console.log("pending orders", pendingOrders);
  try {
    res.render('admin-pages/adminDashBoard', {
      userCount: userCount, orders, totalSales, pendings: pendingOrders
    })
  } catch (error) {
    res.send(error)
  }
}
//logout session destroy
exports.handleLogout = function (req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.log('Session destroy error:', err);
      return res.status(500).send('Could not log out');
    }
    res.clearCookie('connect.sid');
    res.redirect('/admin');
  });
}
//display user
exports.displayUsers = async (req, res) => {

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';

    const filter = search
      ? {
        $or: [
          { firstName: { $regex: new RegExp(search, 'i') } },
          { email: { $regex: new RegExp(search, 'i') } },
          { phone: { $regex: new RegExp(search, 'i') } },
        ]
      }
      : {};

    const sort = { createdAt: -1 };
    const { skip } = paginate({ totalDocs: 0, page, limit });

    const { data, totalDocs } = await adminModel.getPaginatedUsers(filter, sort, skip, limit);
    console.log("dataa", data);
    const { totalPages } = paginate({ totalDocs, page, limit });
    res.render('admin-pages/user-list', {
      users: data,
      totalPages,
      currentPage: page,
      search
    });
  } catch (error) {
    console.error("Error rendering user list:", error);
    res.status(500).send("Internal Server Error");
  }
};
//disable or enable user
exports.controleUser = async (req, res) => {

  const userId = req.params.id
  console.log(userId);

  let userData = await adminModel.userControll(userId)
  res.redirect('/admin/users')
}
//oder page
exports.orderPage = async (req, res) => {
  try {


    const data = await adminModel.viewOrders();

    let orderData = data.ordersWithDetails
    const filter = req.query.search || '';
    console.log("filter value:", req.query.search);
    if (filter) {
      console.log("Applying filter:", filter);
      orderData = orderData.filter(order => {
        console.log("orderId", order.orderId)
        return order.orderId == filter

      });
    }

    res.render('admin-pages/allOrders', {
      orders: orderData,
      filter,
      search: req.query.search || ''
    });
  } catch (error) {
    console.error('Error rendering order page:', error);
    res.status(500).send('Internal Server Error');
  }
};
//edit order page
exports.editOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const result = await adminModel.updateOrderStatus(orderId, status);
    if (!result)
      return res.status(404).json({ success: false, message: "Order not found" });
    // all item change sts

    await adminModel.updateItemsStatus(orderId, status);
    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: { orderId, status }
    });
  } catch (err) {
    console.error("editOrderStatus error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.orderAccept = async (req, res) => {
  try {
    const { orderId, returnStatus } = req.body;
    const result = await adminModel.returnAccept(orderId, returnStatus);
    res.status(result ? 200 : 400).json({
      success: !!result,
      message: result ? "Product return accepted" : "Failed to accept return"
    });
  } catch (err) {
    console.error(" orderAccept error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.updateItems = async (req, res) => {
  try {
    const result = await adminModel.updateItemStatus(req.body);
    res.status(result ? 200 : 400).json({ success: !!result });
  } catch (err) {
    console.error(" updateItems error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
// approve return product
exports.handleReturnProduct = async (req, res) => {
  console.log("request body in return product", req.body);
  let wallet
  try {
    const { userId, orderId, productId, variantId, status, refundAmount } = req.body;
    let checkforWallet = await adminModel.checkUserWallet(userId);
    if (status === 'Approved') {
      //check user wallet exists
      if (!checkforWallet) {
        wallet = await adminModel.createWallet(req.body);
        if ((wallet && wallet.acknowledged) || (updateWallet && updateWallet.modifiedCount > 0)) {
          return res.status(200).json({ success: true, message: "Return processed successfully" });
        } else {
          return res.status(400).json({ success: false, message: "Failed to process return" });
        }
      } else {

        let updateWallet = await adminModel.updateWallet(req.body);
        if (updateWallet && updateWallet.modifiedCount > 0) {
          return res.status(200).json({ success: true, message: "Return processed successfully" });
        } else {
          return res.status(400).json({ success: false, message: "Failed to process return" });
        }
      }
    } if (status === 'Rejected') {

      let response = await adminModel.rejectReturnProduct(req.body);
      if (response && response.modifiedCount > 0) {
        return res.status(200).json({ success: true, message: "Return Rejected successfully" });
      } else {
        return res.status(400).json({ success: false, message: "Failed to process return" });
      }
    }



  } catch (err) {
    console.error(" handleReturnProduct error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}
//viewOffer
exports.viewOffer = async (req, res) => {
  try {
    const categories = await productModel.getAllCategories() || [];
    const allProducts = await productModel.viewAllProducts();
    const products = allProducts?.products || [];
    const offer = await adminModel.offerView();
    // console.log(JSON.stringify(offer,null,2));
    //     console.log(JSON.stringify(allProducts,null,2));
    //         console.log(JSON.stringify(categories,null,2));



    res.render("admin-pages/offers.ejs", {
      offer: offer || [],
      categories,
      products,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error("Error in viewOffer:", err);
    res.render("admin-pages/offers.ejs", {
      offer: [],
      categories: [],
      products: [],
      error: "Failed to load offers",
      success: null
    });
  }
};
// add offers
exports.addOffers = async (req, res) => {
  const { error, value } = offerValidation(req.body);

  if (error) {
    console.log("Validation Errors:", error.details);
    return res.status(400).json({
      success: false,
      errors: error.details.map(d => d.message)
    });
  }

  try {
    const response = await adminModel.offerAdd(value);

    if (response.exists) {
      // Duplicate found
      return res.status(409).json({
        success: false,
        message: response.message
      });
    }

    if (response.inserted) {
      // Insert successful
      return res.status(201).json({
        success: true,
        message: "Offer added successfully"
      });
    }

    // Fallback
    return res.status(500).json({
      success: false,
      message: "Failed to add offer"
    });

  } catch (err) {
    console.error("Error while adding offer:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
exports.disableOffer = async (req, res) => {
  const id = req.params.offerId
  const response = adminModel.disableOffer(id, req.body)
  if (response) return res.status(200).json({ success: true, message: "offer deleted" })

  res.status(400).json({ success: false, message: "error in delete" })
}
exports.couponPage = async (req, res) => {
  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  let result = await adminModel.viewCouponPage();
  res.render('admin-pages/coupons.ejs', {
    coupons: result || [],
    generatedCode: generateCouponCode()
  });
};
exports.addCoupon = async (req, res) => {
  try {
    const { error, value } = couponValidation(req.body);
    if (error) {
      console.log("req.body", req.body);
      console.log("errror", error);
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    let { code, discount, validFrom, validUntil, minPurchase } = req.body;

    discount = Number(discount);
    minPurchase = Number(minPurchase) || 0;

    if (discount < 1 || discount > 100) {
      return res.status(400).send('Discount must be between 1 and 100%');
    }

    validFrom = validFrom ? new Date(validFrom) : new Date();
    validUntil = validUntil ? new Date(validUntil) : null;

    const newCoupon = {
      code,
      discount,
      discountType: 'percentage',
      validFrom,
      validUntil,
      minimumPurchase: minPurchase,
      isActive: true
    }

    let response = await adminModel.addCoupon(newCoupon);
    if (response) {
      return res.status(200).json({ success: true, message: "coupon added sussessfully" })
    }
    return res.status(400).json({ success: false, message: "coupon adding failed" })

  } catch (error) {
    console.error(error);
    res.status(500).send('Server error while adding coupon');
  }
};
exports.deleteCoupon = async (req, res) => {
  const couponId = req.params.couponId;
  console.log("Coupon ID to delete:", couponId);
  let response = await adminModel.deleteCoupon(couponId);
  console.log("Delete response:", response);
  if (response && response.modifiedCount > 0) {
    return res.status(200).json({ success: true, message: "Coupon removed successfully" })
  }
}
exports.editCoupon = async (req, res) => {
  try {
    const { error, value } = couponValidation(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, details: error.details });

    const couponId = req.params.couponId;
    let response = await adminModel.editCoupon(couponId, req.body);
    if (response && response.modifiedCount > 0) {
      return res.status(200).json({ success: true, message: "Coupon updated successfully" });
    }

  } catch (error) {
    console.error("Error editing coupon:", error);
    res.status(500).json({ success: false, message: "Server error while editing coupon" });
  }
}

exports.returnOrdersPage = async (req, res) => {
  try {

    const data = await adminModel.viewReturnPage();
    res.render('admin-pages/returnPage.ejs', {
      ordersWithDetails: data,
      search: req.query.search || ''
    });

  }
  catch (error) {
    console.error('Error rendering return orders page:', error);
    res.status(500).send('Internal Server Error');
  }
}
//return history page
exports.returnHistoryPage = async (req, res) => {
  try {
    const data = await adminModel.viewReturnHistoryPage();
    console.log("return history data", JSON.stringify(data, null, 2));
    res.render('admin-pages/returnHistory.ejs', {
      returns: data || [],
      search: req.query.search || ''
    });
  }
  catch (error) {
    console.error('Error rendering return history page:', error);
    res.status(500).send('Internal Server Error');
  }
}
//sales report page
exports.salesReportPage = async (req, res) => {
  try {
    const filter = req.query.filter;
    console.log("Sales Report Filter:", filter);

    const now = new Date();
    let startDate, endDate;

    // Predefined filters
    if (filter === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (filter === 'week') {
      const first = now.getDate() - now.getDay();
      startDate = new Date(now.setDate(first));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } 
    // Custom date filter
    else if (filter === 'custom') {
      const { start, end } = req.query;
      if (start && end) {
        startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
      } else {
        console.log("Missing start or end date for custom filter");
      }
    }

    // Orders count
    const ordersData = await adminModel.viewOrders();
    const orders = ordersData.ordersWithDetails.length;
    console.log("total orders in sales report page", orders);

    // Sales data
    const salesData = await adminModel.salesReportData();

    let filteredSales = salesData;
    if (startDate && endDate) {
      filteredSales = salesData.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);
    res.render('admin-pages/salesReport.ejs', {
      sales: filteredSales || [],
      search: req.query.search || '',
      orders
    });
  } catch (error) {
    console.error('Error rendering sales report page:', error);
    res.status(500).send('Internal Server Error');
  }
};
const PDFDocument = require("pdfkit");

exports.generateSalesReportPDF = async (req, res) => {
  try {
    console.log("PDF generation requested:", req.body);

    const { data = [], filter, start, end } = req.body;
    const companyName = "TechPrime";

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "No sales data provided." });
    }

    // Summary calculations
    const totalOrders = data.length;
    const totalRevenue = data.reduce((sum, o) => sum + parseFloat(o.total.replace(/,/g, "")), 0);
    const deliveredOrders = data.filter(o => o.status === "Delivered").length;
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

    // Initialize PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales_report_${filter || "all"}.pdf`
    );
    doc.pipe(res);

    // HEADER
    doc
      .fontSize(20)
      .fillColor("#2563EB")
      .text(`${companyName} Sales Report`, { align: "center" })
      .moveDown(0.5)
      .fontSize(12)
      .fillColor("gray")
      .text(
        `Report Period: ${
          filter === "custom" ? `${start || "N/A"} → ${end || "N/A"}` : filter || "All"
        }`,
        { align: "center" }
      )
      .moveDown(1.2);

    // TABLE HEADER
    const headers = [
      "Order ID",
      "Customer",
      "Product",
      "Qty",
      "Total (₹)",
      "Payment",
      "Status",
      "Date"
    ];
    const columnWidths = [80, 90, 80, 30, 60, 60, 70, 60];
    let y = doc.y + 10;

    doc.fillColor("white").rect(50, y - 5, 495, 20).fill("#3B82F6");
    doc.fillColor("white").fontSize(10);
    let x = 55;
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: columnWidths[i], align: "left" });
      x += columnWidths[i];
    });
    y += 20;

    // TABLE ROWS
    data.forEach((order, index) => {
      const bg = index % 2 === 0 ? "#F1F5F9" : "#FFFFFF";
      doc.rect(50, y - 2, 495, 18).fill(bg).fillColor("#0F172A").fontSize(9);

      const rowData = [
        order.orderId,
        order.customer,
        order.product,
        order.quantity,
        order.total,
        order.payment,
        order.status,
        order.date
      ];

      let xRow = 55;
      rowData.forEach((cell, i) => {
        doc.text(String(cell), xRow, y, { width: columnWidths[i], align: "left" });
        xRow += columnWidths[i];
      });
      y += 18;

      if (y > 750) {
        doc.addPage();
        y = 70;
      }
    });

    // SUMMARY SECTION
    y += 30;
    doc
      .fontSize(14)
      .fillColor("white")
      .rect(50, y - 8, 495, 22)
      .fill("#1E293B")
      .text("Summary", 55, y - 5, { align: "left" });

    y += 25;
    const summaryData = [
      ["Total Orders", totalOrders],
      ["Delivered Orders", deliveredOrders],
      ["Total Revenue", `₹${totalRevenue.toLocaleString()}`],
      ["Average Order Value", `₹${parseFloat(avgOrderValue).toLocaleString()}`]
    ];

    doc.fontSize(11);
    summaryData.forEach(([label, value]) => {
      doc.fillColor("#334155").text(label, 60, y);
      doc.fillColor("#0F172A").text(String(value), 400, y, { align: "right" });
      y += 18;
    });

    // FOOTER
    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor("gray")
      .text("Generated by TechPrime Admin Panel", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).json({ message: "Error generating PDF" });
  }
};





exports.generateSalesReport = async (req, res) => {
  try {
    console.log("Generating sales report...", req.body);

    const { data = [], filter, start, end } = req.body;
    const companyName = "TechPrime";

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "No sales data provided." });
    }

    const totalOrders = data.length;
    const totalRevenue = data.reduce((sum, o) => sum + parseFloat(o.total.replace(/,/g, "")), 0);
    const deliveredOrders = data.filter(o => o.status === "Delivered").length;
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    // HEADER STYLING
    sheet.mergeCells("A1:H1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `${companyName} Sales Report`;
    titleCell.font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { horizontal: "center" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };

    // Period
    sheet.mergeCells("A2:H2");
    const periodCell = sheet.getCell("A2");
    periodCell.value = `Report Period: ${
      filter === "custom" ? `${start || "N/A"} → ${end || "N/A"}` : filter || "All"
    }`;
    periodCell.font = { italic: true, color: { argb: "FF475569" } };
    periodCell.alignment = { horizontal: "center" };

    // TABLE HEADERS
    const headers = [
      "Order ID",
      "Customer",
      "Product",
      "Quantity",
      "Total (₹)",
      "Payment",
      "Status",
      "Date"
    ];
    sheet.addRow([]);
    const headerRow = sheet.addRow(headers);

    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      };
      cell.alignment = { horizontal: "center" };
    });

    // DATA ROWS
    data.forEach(order => {
      const row = sheet.addRow([
        order.orderId,
        order.customer,
        order.product,
        order.quantity,
        parseFloat(order.total.replace(/,/g, "")),
        order.payment,
        order.status,
        order.date
      ]);

      // Conditional formatting
      const statusCell = row.getCell(7);
      if (order.status === "Delivered")
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } };
      else
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };

      row.eachCell(cell => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" }
        };
      });
    });

    // SUMMARY SECTION
    sheet.addRow([]);
    sheet.addRow(["Summary"]);
    const summaryRow = sheet.lastRow;
    summaryRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    summaryRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

    const summaryData = [
      ["Total Orders", totalOrders],
      ["Delivered Orders", deliveredOrders],
      ["Total Revenue", `₹${totalRevenue.toLocaleString()}`],
      ["Average Order Value", `₹${parseFloat(avgOrderValue).toLocaleString()}`]
    ];

    summaryData.forEach(([label, value]) => {
      const row = sheet.addRow([label, value]);
      row.getCell(1).font = { bold: true, color: { argb: "FF334155" } };
      row.getCell(2).font = { color: { argb: "FF0F172A" } };
      row.eachCell(cell => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" }
        };
      });
    });

    // Auto column width
    sheet.columns.forEach(col => {
      col.width = 18;
    });

    // Send Excel
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales_report_${filter || "all"}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Sales report generation failed:", err);
    res.status(500).json({ message: "Error generating sales report" });
  }
};
