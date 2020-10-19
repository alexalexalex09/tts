// routes/auth.js

var express = require("express");
var router = express.Router();
var passport = require("passport");
var dotenv = require("dotenv");
var util = require("util");
var url = require("url");
var querystring = require("querystring");

dotenv.config();

// Perform the login, after login Auth0 will redirect to callback
router.get(
  "/login",

  function (req, res, next) {
    //set req.session.returnTo here? Yes.
    console.log("login:: ", req.originalUrl);
    req.session.returnTo = req.session.previousURL;
    next();
  },
  passport.authenticate("auth0", {
    scope: "openid email profile",
  })
);

// Perform the final stage of authentication and redirect to previously requested URL or '/user'
router.get("/callback", function (req, res, next) {
  passport.authenticate("auth0", function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect("/nouser");
    }
    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }
      console.log("CallBack:: ", req.originalURL, req.session);
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || "/andthen");
    });
  })(req, res, next);
});

// Perform session logout and redirect to homepage
router.get("/logout", (req, res) => {
  console.log("LOGGING OUT");
  req.logout();
  console.log("Protocol: ", req.protocol);
  var returnTo = req.protocol + "://" + req.hostname;
  var port = req.connection.localPort;
  if (port == 3000) {
    returnTo += ":" + port;
  }
  var logoutURL = new url.URL(
    util.format("https://%s/v2/logout", process.env.AUTH0_DOMAIN)
  );
  var searchString = querystring.stringify({
    client_id: process.env.AUTH0_CLIENT_ID,
    returnTo: returnTo,
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL);
});

module.exports = router;
