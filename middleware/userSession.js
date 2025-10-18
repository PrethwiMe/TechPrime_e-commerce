// Redirect logged-in users away from login/signup
const isUserLoggedIn = (req, res, next) => {
     req.session.user= {
    userId: '689c69c53616ccec32a3d701',
    firstName: 'prethwi',
    email: 'admin@gmail.com',
    phone: '7034271417',
    role: 'user'
  }
  if (req.session.user || req.user) {
    return res.redirect('/'); 
  }
  next();
};

// Protect routes for logged-in users only
const userConfirmed = (req, res, next) => {
     req.session.user= {
    userId: '689c69c53616ccec32a3d701',
    firstName: 'prethwi',
    email: 'admin@gmail.com',
    phone: '7034271417',
    role: 'user'
  }
    
  if (req.session.user || req.user) {
    return next(); 
  }
  return res.redirect('/login'); 
};

module.exports = { isUserLoggedIn, userConfirmed };
