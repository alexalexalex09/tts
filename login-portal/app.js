var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
const bodyParser = require('body-parser');
const publicRouter = require("./routes/public");
const usersRouter = require("./routes/users");
const session = require("express-session");
const okta = require("@okta/okta-sdk-nodejs");
const ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;
const http = require('http');


var app = express();

// Okta/OIDC middleware
var oktaClient = new okta.Client({
  orgUrl: 'https://dev-222844.okta.com',
  token: '00T-POzgNn1N2HdBngzKuLiA0a8VynCvD8gQGsFCkr'
});
const oidc = new ExpressOIDC({
  issuer: "https://dev-222844.okta.com/oauth2/default",
  client_id: '0oa3ate5jDukoR2LH4x6',
  client_secret: 'SaLJUuCshNXVz2CE3k7hcd5O-WpilWVSsoeGnD8-',
  redirect_uri: 'http://localhost:3000/users/callback',
  scope: "openid profile",
  routes: {
    login: {
      path: "/users/login"
    },
    callback: {
      path: "/users/callback",
      defaultRedirect: "/"
    }
  }
});

//configure body-parser to be used as middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


// App routes
app.use(session({
  secret: '9=*)45qbn0vdASFVF(N&)Y434btADSS9n874yfb09SVNDF(N4gv3',
  resave: true,
  saveUninitialized: false
}));
app.use(oidc.router);
app.use((req, res, next) => {
  if (!req.userinfo) {
    return next();
  }

  oktaClient.getUser(req.userinfo.sub)
    .then(user => {
      req.user = user;
      res.locals.user = user;
      next();
    }).catch(err => {
      next(err);
    });
});

//Router
app.use('/', publicRouter);
app.use('/users', usersRouter);
app.get('/test', (req, res) => {
  res.json({ profile: req.user ? req.user.profile : null });
});

function loginRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).render("unauthenticated");
  }

  next();
}

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


