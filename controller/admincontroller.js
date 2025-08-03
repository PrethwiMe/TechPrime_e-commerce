const { getDB } = require('../config/mongodb')
const adminmodel = require('../model/adminModel')
//hasing modules
const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';


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
    let data = await adminmodel.adminLogin(email)
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
    res.clearCookie('connect.sid'); // Default session cookie name
    res.redirect('/admin');
  });
}

exports.displayUsers = async (req, res) => {
  try {
    const users = await adminmodel.userDataFetch();
    console.log("Fetched users:", users); // confirm it's defined
    res.render('admin-pages/user-list', { users }); // no .ejs here
  } catch (error) {
    console.error("Error rendering user list:", error);
    res.status(500).send("Internal Server Error");
  }
};