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

exports.sentAdminPage = (req, res) => {
  res.render('admin-pages/login',{error:null, success:false})
}

exports.loginfunction = async (req, res) => {
  try {
    
    const { email, password } = req.body;
    let data = await adminmodel.adminLogin(email)
    console.log(data);
    
    if (!data) {
    return  res.render('admin-pages/login',{error:"You are Not authorised....!!"})
    }
    //decrypt password
    bcrypt.compare(password, data.password, function(err, result) {
          console.log(result);

    if (err) {
       console.error(err);
       return res.render('admin-pages/login',{error:"somthing wromg"})
    }
    if (result) {
   return res.render("admin-pages/login", { success: true });
    }

     res.render("admin-pages/login", { error: "Invalid credentials", success: false });
});

  } catch (error) {
    console.log(error)
    return res.status(500).render('error', { error: 'Server error. Please try again.' });

  }

};

exports.dashBoardHandle = (req,res) => {
  console.log("call dash board😁");
  try {
    res.render('admin-pages/adminDashBoard')
  } catch (error) {
    res.send(error)
  }
}
