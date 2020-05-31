require("dotenv").config();
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var logger = require("morgan");
const bodyParser = require("body-parser");
const publicRouter = require("./routes/public");
const usersRouter = require("./routes/users");
const session = require("express-session");
const okta = require("@okta/okta-sdk-nodejs");
const ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;
const cfenv = require("cfenv");
var socket_io = require("socket.io");

var app = express();

//CF variables

var appEnv = cfenv.getAppEnv();
if (appEnv.isLocal) {
  var baseURL = appEnv.url.slice(0, appEnv.url.length - 4) + 3000;
} else {
  var baseURL = appEnv.url;
}

// Okta/OIDC middleware
var oktaClient = new okta.Client({
  orgUrl: process.env.oUrl,
  token: process.env.oToken,
});
const oidc = new ExpressOIDC({
  issuer: process.env.oIssuer,
  client_id: process.env.oClient_id,
  client_secret: process.env.oSecret,
  redirect_uri: baseURL + "/users/callback",
  scope: "openid profile",
  routes: {
    login: {
      path: "/users/login",
    },
    callback: {
      path: "/users/callback",
      defaultRedirect: "/",
    },
  },
});

//configure body-parser to be used as middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Okta setup
app.use(
  session({
    secret: process.env.sSecret,
    resave: true,
    saveUninitialized: false,
  })
);
app.use(oidc.router);
app.use((req, res, next) => {
  if (!req.userinfo) {
    return next();
  }
  //Make user variable available
  oktaClient
    .getUser(req.userinfo.sub)
    .then((user) => {
      req.user = user;
      res.locals.user = user;
      next();
    })
    .catch((err) => {
      next(err);
    });
});

//Routers
app.use("/", publicRouter);
app.use("/users", usersRouter);

//Authenticated page logic - just call loginRequired to protect!
function loginRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).render("unauthenticated");
  }

  next();
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
