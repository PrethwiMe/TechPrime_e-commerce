var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var expressLayouts = require('express-ejs-layouts');
const { connectDB } = require('./config/mongodb');

var app = express()

connectDB();



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//layout
app.use(expressLayouts);
app.set('layout', 'layouts/main'); 

app.use(express.urlencoded({ extended: true }));

app.use(logger('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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
