require("dotenv").config();
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var logger = require("morgan");
const bodyParser = require("body-parser");
const publicRouter = require("./routes/public");
var authRouter = require("./routes/auth");
const session = require("express-session");
const cfenv = require("cfenv");
var socket_io = require("socket.io");
var ManagementClient = require("auth0").ManagementClient;

var app = express();

//Auth0 vars
var sess = {
  secret: process.env.oaSecret,
  cookie: {},
  resave: false,
  saveUninitialized: true,
};

var management = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_NON_INTERACTIVE_CLIENT_ID,
  clientSecret: process.env.AUTH0_NON_INTERACTIVE_CLIENT_SECRET,
  scope: "read:users update:users",
});

if (app.get("env") === "production") {
  // Use secure cookies in production (requires SSL/TLS)
  sess.cookie.secure = true;

  // Uncomment the line below if your application is behind a proxy (like on Heroku)
  // or if you're encountering the error message:
  // "Unable to verify authorization request state"
  app.set("trust proxy", 1);
}
app.use(session(sess));

var envs = {
  orgUrl: process.env.oUrl,
  token: process.env.oToken,
  issuer: process.env.oIssuer,
  client_id: process.env.oClient_id,
  client_secret: process.env.oSecret,
  secret: process.env.sSecret,
};
//console.log(envs);

// Load Passport
var passport = require("passport");
var Auth0Strategy = require("passport-auth0");

// Configure Passport to use Auth0

console.log("Callback: ", process.env.AUTH0_CALLBACK_URL);
var strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:
      process.env.AUTH0_CALLBACK_URL || "http://dev.tts:3000/callback",
  },
  function (accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
  }
);

passport.use(strategy);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

/*
// Okta/OIDC middleware
var oktaClient = new okta.Client({
  orgUrl: envs.orgUrl,
  token: envs.token,
});
console.log("baseURL: ", baseURL);
const oidc = new ExpressOIDC({
  issuer: envs.issuer,
  client_id: envs.client_id,
  client_secret: envs.client_secret,
  //redirect_uri: baseURL + "/users/callback", (upgraded to 2.0)
  appBaseUrl: baseURL,
  scope: "openid profile",
  routes: {
    login: {
      path: "/users/login",
    },
    loginCallback: {
      path: "/users/callback",
      afterCallback: "/",
    },
  },
});
*/
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

/*
// Okta setup
app.use(
  session({
    secret: envs.secret,
    resave: true,
    saveUninitialized: false,
  })
);
app.use(oidc.router);
app.use((req, res, next) => {
  if (!req.userContext) {
    return next();
  }
  //Make user variable available
  oktaClient
    .getUser(req.userContext.userinfo.sub)
    .then((user) => {
      req.user = user;
      res.locals.user = user;
      next();
    })
    .catch((err) => {
      next(err);
    });
});
*/

app.use((req, res, next) => {
  console.log("custom middleware called*****************");
  if (req.user) {
    console.log("with user");
    management.users.get({ id: req.user.user_id }, function (err, extUser) {
      console.log("auth0 user:", extUser);
      res.locals.user = req.user;
      if (
        extUser &&
        extUser.user_metadata &&
        extUser.user_metadata.userDefinedName != ""
      ) {
        res.locals.username = extUser.user_metadata.userDefinedName;
        console.log(
          "Assigning metadata username to locals: ",
          res.locals.username
        );
      } else {
        res.locals.username = req.user.displayName;
      }
      res.locals.email = req.user.emails[0].value;
      next();
    });
  } else {
    console.log("No user");
    next();
  }
});

//Routers
app.use("/", publicRouter);
app.use("/", authRouter);

//Authenticated page logic - just call loginRequired to protect!
/*function loginRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).render("unauthenticated");
  }

  next();
}*/

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  if (
    req.originalUrl.substr(1).length == 5 &&
    /^([a-zA-Z0-9]{5})$/.test(req.originalUrl.substr(1))
  ) {
    res.redirect("/?s=" + req.originalUrl.substr(1));
  } else {
    res.redirect("/?err=404");
  }
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
