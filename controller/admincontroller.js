const { getDB } = require('../config/mongodb')
const adminModel = require('../model/adminModel')
//hasing modules
const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';
const paginate = require('../utils/paginate');


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
exports.orderPage = async (req, res) => {
  try {
    const data = await adminModel.viewOrders(); 
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

        console.log(req.body); // Debugging

        await adminModel.updateOrderStatus(orderId, status);

     return res.status(200).json({success:true,message:"Done"})

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
//accept return
exports.orderAccept = async(req,res) => {
  console.log(req.body);
  //ojectid
  const id = req.body.orderId;
  const status = req.body.returnStatus

  const result = await adminModel.returnAccept(id,status)

  if(result) return res.status(200).json({success:true,message:"product Accepted"})
    else return res.status(400).json({success:false, message:"failed to accept product"})

}