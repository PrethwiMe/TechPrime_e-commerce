const adminModel = require('../model/adminModel')
//hasing modules
const bcrypt = require('bcrypt');
const paginate = require('../utils/paginate');
const productModel = require('../model/productModels');
const {offerValidation,couponValidation} = require('../utils/validation')


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
exports.dashBoardHandle = (req, res) => {

  try {
    res.render('admin-pages/adminDashBoard')
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
            { phone: { $regex: new RegExp(search, 'i') } }
          ]
        }
      : {};

    const sort = { createdAt: -1 };
    const { skip } = paginate({ totalDocs: 0, page, limit });

    const { data, totalDocs } = await adminModel.getPaginatedUsers(filter, sort, skip, limit);

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
exports.controleUser =async (req,res) => {

  const userId=req.params.id
  console.log(userId);

  let userData =await adminModel.userControll(userId)
  res.redirect('/admin/users')
}
//oder page
exports.orderPage = async (req, res) => {
  try {
    const data = await adminModel.viewOrders(); 
    console.log("all orders in admin:::",JSON.stringify(data,null,2));
    const filter = req.query.filter || 'Order status';
    res.render('admin-pages/allOrders', {
      orders: data.ordersWithDetails, 
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
exports.disableOffer = async (req,res) => {
  const id = req.params.offerId
  const response = adminModel.disableOffer(id,req.body)
  if(response) return res.status(200).json({success:true,message:"offer deleted"})

     res.status(400).json({success:false,message:"error in delete"})
}
exports.couponPage =async (req, res) => {
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
    const {error, value} = couponValidation(req.body);
    if (error) {
      console.log("req.body",req.body);
      console.log("errror",error);
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
if(response){
  return res.status(200).json({success:true,message:"coupon added sussessfully"})
}
  return res.status(400).json({success:false,message:"coupon adding failed"})

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
    if (error) return res.status(400).json({ success: false, message:error.details[0].message, details: error.details });

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