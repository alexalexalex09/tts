require("dotenv").config();
//var createError = require("http-errors");
var express = require("express");
var path = require("path");
var logger = require("morgan");
const bodyParser = require("body-parser");
const publicRouter = require("./routes/public");
const authRouter = require("./routes/auth");
const qrRouter = require("./routes/qr");
const session = require("express-session");
const cfenv = require("cfenv");
//var socket_io = require("socket.io");
var ManagementClient = require("auth0").ManagementClient;
//const requireHTTPS = require("./middleware/requireHTTPS");
var compression = require("compression");

var app = express();

//Replace MemoryStore
const MongoStore = require("connect-mongo")(session);
var sess = {
  secret: process.env.CONNECT_MONGO_SECRET,
  saveUninitialized: true, // create session before something stored
  resave: false, //don't save session if unmodified
  store: new MongoStore({ url: process.env.mongo }),
  cookie: {},
};
if (app.get("env") === "production") {
  // Use secure cookies in production (requires SSL/TLS)
  sess.cookie.secure = true;

  // Uncomment the line below if your application is behind a proxy (like on Heroku)
  // or if you're encountering the error message:
  // "Unable to verify authorization request state"
  app.set("trust proxy", 1);
}
app.use(session(sess));

//app.use(requireHTTPS);
app.use(compression());
app.get("*", function (req, res, next) {
  //console.log("host: ", req.headers.host);

  if (req.headers.host.indexOf(":3000") == -1 && !req.secure) {
    res.redirect("https://" + req.headers.host + req.url);
  } else {
    next();
  }
});
//Auth0 vars

var management = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_NON_INTERACTIVE_CLIENT_ID,
  clientSecret: process.env.AUTH0_NON_INTERACTIVE_CLIENT_SECRET,
  scope: "read:users update:users",
});

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
//This includes the port when on localhost:
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
  //console.log("custom middleware called*****************");
  if (req.user) {
    management.users.get({ id: req.user.user_id }, function (err, extUser) {
      //console.log("auth0 user:", extUser);
      res.locals.user = req.user;
      if (extUser) {
        if (
          extUser.user_metadata &&
          extUser.user_metadata.userDefinedName &&
          extUser.user_metadata.userDefinedName.length > 0
        ) {
          res.locals.username = extUser.user_metadata.userDefinedName;
          console.log(
            "Assigning metadata username to locals: ",
            res.locals.username
          );
        } else {
          if (
            extUser.username != "" &&
            typeof extUser.username != "undefined"
          ) {
            res.locals.username = extUser.username;
            console.log(
              "Assigning auth0 username to locals: ",
              extUser.username
            );
          } else {
            res.locals.username = extUser.name;
            console.log("Assigning auth0 Name to locals: ", extUser.name);
          }
        }
      } else {
        res.locals.username = req.user.displayName;
        console.log("Assigning displayname to locals");
      }
      res.locals.email = req.user.emails[0].value;
      next();
    });
  } else {
    console.log("No user");
    next();
  }
});

//Serviceworker
/*app.use((req, res, next) => {
  if (req.originalUrl == "/sw.js") {
    res.sendFile(path.join(__dirname, "public", "sw.js"));
  } else {
    next();
  }
});*/

//Routers
app.use("/", publicRouter);
app.use("/", authRouter);
app.use("/", qrRouter);

//Authenticated page logic - just call loginRequired to protect!
/*function loginRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).render("unauthenticated");
  }

  next();
}*/

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  /*if (
    req.originalUrl.substr(1).length == 5 &&
    /^([a-zA-Z0-9]{5})$/.test(req.originalUrl.substr(1))
  ) {
    //res.redirect("/?s=" + req.originalUrl.substr(1));
  } else {
    if (
      req.originalUrl.substr(1).length == 6 &&
      /^([a-zA-Z0-9]{6})$/.test(req.originalUrl.substr(1))
    ) {
      //res.redirect("/?l=" + req.originalUrl.substr(1));
    } else {*/
  console.log("404: " + path.join(__dirname, "public") + req.originalUrl);
  res.redirect("/?err=404");
  /*}
  }*/
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
