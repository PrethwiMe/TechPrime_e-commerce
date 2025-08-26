// Redirect logged-in users away from login/signup
const isUserLoggedIn = (req, res, next) => {
  if (req.session.user || req.user) {
    return res.redirect('/'); 
  }
  next();
};

// Protect routes for logged-in users only
const userConfirmed = (req, res, next) => {

    console.log(req.session.user);
    
  if (req.session.user || req.user) {
    return next(); 
  }
  return res.redirect('/login'); 
};

module.exports = { isUserLoggedIn, userConfirmed };
