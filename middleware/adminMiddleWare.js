const { ObjectId } = require('mongodb'); // or use mongoose.Types.ObjectId for testing !!!!!!!!!!!!!!!!!!!!1


const isUserLoggedIn = (req, res, next) => {
  console.log("session called");
//  req.session.admin = {
//     id: new ObjectId('688ca0964736b3b08b54f17c'),
//     name: 'admin',
//     email: 'admin@gmail.com'
//   };
  if (req.session.admin) {
    return res.redirect('/admin/dashboard')
  }
  next();
};

const adminConfirmed = (req, res, next) => {
  if (req.session.admin) {
    return next();
  }

  return res.redirect('/admin')
}

module.exports = { isUserLoggedIn, adminConfirmed }