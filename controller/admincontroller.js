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
  res.render('admin-pages/login',{error:null})
}

exports.loginfunction = async (req, res) => {
  try {
    console.log("called body");
    const { email, password } = req.body;
    let result = await adminmodel.adminLogin(email)
    if (!result) {
      res.render('admin-pages/login',{error:"invalid data"})
    }
    //decrypt password
    bcrypt.compare(password, result.password, function(err, result) {
    if (err) {
       console.error(err);
        return res.status(500).render('error', { error: 'Server error during password comparison' });
    }
    if (result) {
      res.send("access granted")
    }
});

  } catch (error) {
    console.log(error)
    return res.status(500).render('error', { error: 'Server error. Please try again.' });

  }

};
