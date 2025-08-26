const { ObjectId } = require('mongodb'); // or use mongoose.Types.ObjectId for testing !!!!!!!!!!!!!!!!!!!!1


const isUserLoggedIn = (req, res, next) => {

  if (req.session.admin || null) {
    return res.redirect('/admin/dashboard')
  }
  next();
  
};

const adminConfirmed = (req, res, next) => {

  if (req.session.admin || null) {
    return next();
  }

  return res.redirect('/admin')
}

module.exports = { isUserLoggedIn, adminConfirmed }