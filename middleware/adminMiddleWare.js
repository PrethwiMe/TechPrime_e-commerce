const { ObjectId } = require('mongodb'); 


const isUserLoggedIn = (req, res, next) => {
  // req.session.admin = 1

  if (req.session.admin || null) {
    return res.redirect('/admin/dashboard')
  }
  next();
  
};

const adminConfirmed = (req, res, next) => {
// req.session.admin = 1
  if (req.session.admin || null) {
    return next();
  }

  return res.redirect('/admin')
}

module.exports = { isUserLoggedIn, adminConfirmed }