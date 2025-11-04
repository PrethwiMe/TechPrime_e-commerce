const dbVariables = require('../config/databse');
const { getDB } = require('../config/mongodb');
const { ObjectId } = require('mongodb');

const isUserLoggedIn = async (req, res, next) => {
  try {
       req.session.user= {
  userId: '68a2c96ce00fc69e9deec4a9',
  firstName: 'John',
  email: 'john.doe1@example.com',
  phone: '9876543210',
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
  userId: '68a2c96ce00fc69e9deec4a9',
  firstName: 'John',
  email: 'john.doe1@example.com',
  phone: '9876543210',
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
