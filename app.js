var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var expressLayouts = require('express-ejs-layouts');
const { connectDB } = require('./config/mongodb');
const flash = require('connect-flash');
const session = require('express-session');
require('dotenv').config();
const passport = require('./config/passport');
const limitTextLength = require("./middleware/limitChar");
const Razorpay = require('razorpay');
const now = new Date();

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection:');
  console.error(reason); 
});


var app = express()




// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//layout
app.use(expressLayouts);
app.set('layout', 'layouts/main'); 

app.use(express.urlencoded({ extended: true }));
app.use(limitTextLength);

app.use(logger('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.locals.charLimitMsg = null;
  res.locals.user = req.session ? req.session.user || null : null;
  next();
});

// Prevent caching across all pages
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});
(async function (params) {
  connectDB();
})()

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Make razorpay instance available to routes
app.locals.razorpay = razorpay;



app.use(session({
  secret: process.env.SESSION_ID,         
  resave: false,                
  saveUninitialized: false,      
  cookie: {
    maxAge: 1000 * 60 * 65,
    httpOnly: true               
  }
}));



//google
app.use(passport.initialize());
app.use(passport.session());
//develo[er cache]
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    Object.keys(require.cache).forEach(function (id) {
      if (id.includes('/controller/') || id.includes('/model/')) {
        delete require.cache[id];
      }
    });
    next();
  });
}
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Limit input characters (global middleware)
app.use((req, res, next) => {

  // Google OAuth callback sends NO req.body — must skip
  if (req.path.startsWith('/auth/google/callback')) {
    return next();
  }

  if (req.body && typeof req.body === "object") {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === "string" && value.length > 100) {
        return res.status(400).json({
          error: `Field "${key}" exceeds 100 characters limit.`
        });
      }
    }
  }

  next();
});


var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
app.use('/', userRouter);
app.use('/admin', adminRouter)
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
