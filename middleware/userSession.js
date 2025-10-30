const dbVariables = require('../config/databse');
const { getDB } = require('../config/mongodb');
const { ObjectId } = require('mongodb');

const isUserLoggedIn = async (req, res, next) => {
  try {
       req.session.user= {
  userId: '689c69c53616ccec32a3d701',
  firstName: 'prethwi',
  email: 'admin@gmail.com',
  phone: '7034271417',
  role: 'user'
}

    if (!req.session.user || !req.session.user.userId) {
      return next();
    }

    const db = await getDB();
    const user = await db.collection(dbVariables.userCollection).findOne({ _id: new ObjectId(req.session.user.userId) });

    if (!user || user.isActive === false || user.isActive === "blocked") {
      req.session.destroy((err) => {
        if (err) console.error("Session destroy error:", err);
        res.clearCookie('connect.sid');
        return res.redirect('/login');
      });
      return;
    }

    return res.redirect('/');
  } catch (err) {
    console.error("Error in isUserLoggedIn middleware:", err);
    next();
  }
};


// Protect routes  logged users only
const userConfirmed = async (req, res, next) => {
  try {
    
       req.session.user= {
  userId: '689c69c53616ccec32a3d701',
  firstName: 'prethwi',
  email: 'admin@gmail.com',
  phone: '7034271417',
  role: 'user'
}

    if (!req.session.user || !req.session.user.userId) {
      return res.redirect('/login');
    }

    const db = await getDB();
    const user = await db.collection(dbVariables.userCollection).findOne({ _id: new ObjectId(req.session.user.userId) });
    if (!user || user.isActive === false || user.isActive === "blocked") {
      req.session.destroy((err) => {
        if (err) console.error("Session destroy error:", err);
        res.clearCookie('connect.sid');
        return res.redirect('/login');
      });
      return;
    }

    next();
  } catch (err) {
    console.error("Error in userConfirmed middleware:", err);
    res.redirect('/login');
  }
};

module.exports = { isUserLoggedIn, userConfirmed };
