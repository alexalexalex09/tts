require("dotenv").config();
var express = require("express");
var path = require("path");
var logger = require("morgan");
const publicRouter = require("./routes/public");
const authRouter = require("./routes/auth");
const qrRouter = require("./routes/qr");
const session = require("express-session");
require("./mongo.js");
var User = require("./models/users.js");
//var memwatch = require("@floffah/node-memwatch");
/*memwatch.on("stats", function (stats) {
  var currentDate = new Date();
  let time =
    currentDate.getHours() +
    ":" +
    currentDate.getMinutes() +
    ":" +
    currentDate.getSeconds();
  console.log(
    "MEM: " +
      time +
      " | " +
      Number(Number(stats.used_heap_size) / 1000000).toString()
  );
});*/
var compression = require("compression");

var app = express();

//Replace MemoryStore
const MongoStore = require("connect-mongo").default;
var sess = {
  secret: process.env.CONNECT_MONGO_SECRET,
  saveUninitialized: true, // create session before something stored
  resave: false, //don't save session if unmodified
  store: MongoStore.create({
    mongoUrl: process.env.mongo,
    touchAfter: 60 * 5,
    collectionName: "mongoSessions",
  }),
  touchAfter: 60 * 5,
  collectionName: "mongoSessions",
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
app.get("*", async function (req, res, next) {
  //console.log("host: ", req.headers.host);
  //await Session.deleteMany({ code: { $exists: false } });

  if (req.headers.host.indexOf(":3000") == -1 && !req.secure) {
    res.redirect("https://" + req.headers.host + req.url);
  } else {
    next();
  }
});

// Load Passport
var passport = require("passport");
var Auth0Strategy = require("passport-auth0");

// Configure Passport to use Auth0
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

//configure body-parser to be used as middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//This includes the port when on localhost:
app.use(express.static("public"));

app.use((req, res, next) => {
  //Get username from Mongo and pass into locals
  //Would it be better to send this from somewhere else?
  //What function is called upon window load that could populate the username?
  if (req.user) {
    res.locals.user = req.user;
    res.locals.email = req.user.emails[0].value;
    User.findOne({ profile_id: req.user.id }).exec((err, curUser) => {
      if (curUser) {
        if (typeof curUser.name == "undefined") {
          curUser.name = req.user.displayName;
          curUser.save().then(() => {
            res.locals.username = curUser.name;
            //console.log("Name is " + res.locals.username);
            next();
          });
        } else {
          res.locals.username = curUser.name;
          //console.log("Name is " + res.locals.username);
          next();
        }
      } else {
        res.locals.username = "";
        newUser = {
          profile_id: req.user.id,
          name: req.user.displayName,
          lists: { allGames: [], custom: [] },
          bgg: { username: "", collection: [] },
        };
        res.locals.username = req.user.displayName;
        curUser = new User(newUser);
        //console.log("Creating New User in app.js****");
        curUser.save().then(() => {
          //console.log("Name is " + res.locals.username);
          next();
        });
      }
    });
  } else {
    //console.log("Name is not found, no user");
    next();
  }
});

//Routers
app.get("/privacy-tos", function (req, res) {
  res.render("privacy-tos");
});
app.use("/", publicRouter);
app.use("/", authRouter);
app.use("/", qrRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
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
  //res.render("error");
});

module.exports = app;
