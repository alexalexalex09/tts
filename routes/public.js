const express = require("express");
const mysql = require("mysql");
const router = express.Router();
var cfenv = require("cfenv");
var mongoose = require("mongoose");
var User = require("../models/users.js");
var Game = require("../models/games.js");

//CF variables
var appEnv = cfenv.getAppEnv();
var sURL = appEnv.getServiceURL("ad_16459ca7380ad71");
if (appEnv.port == 6002) {
  var baseURL = appEnv.url.slice(0, appEnv.url.length - 4) + 3000;
} else {
  var baseURL = appEnv.url;
}

var mongoDB =
  "mongodb+srv://alextts:iyJaon1sWAdMDA3c@alexcluster-c7uv8.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

//Get current user lists
router.post("/get_user_lists", (req, res) => {
  /*if (req.user) {
    var userid = req.user.id;
    var sqlquery =
      `SELECT * from lists WHERE list_user_id = '<` + userid + `>'`;
    connection.query(sqlquery, function (err, qres, fields) {
      if (err) {
        res.send(err);
      }
      res.send(qres);
    });
  } else {
    res.send({ err: "no user" });
  }*/
  if (req.user) {
    User.find({ profile_id: req.user.id }).then(function (data) {
      res.send("Found a user!");
    });
  } else {
    res.send("Log in first!");
  }
});

router.post("/game_add", function (req, res) {
  if (req.user) {
    //Look up the game. If it doesn't exist, add it and add to user. If it does exist, add to user
    //First, get the game object, for now assuming the game exists. It's an array, so take the first element.

    //if game exists and user doesn't

    Game.findOne({ name: req.body.game }).exec(function (err, game) {
      const user1 = new User({
        profile_id: req.user.id,
        name: req.user.profile.firstName,
        lists: [
          {
            name: "All Games",
            games: [game._id],
          },
        ],
      });
      user1.save(function (err) {
        if (err) {
          res.send("Error! " + err);
        }
        res.send("Success: " + game._id);
      });
    });

    //if user exists and game doesn't

    //if game and user both exist, but game hasn't been added to user's list

    //if users and game exist, and game has already been added to the user's list

    //if neither user nor game exists
  } else {
    res.send("Log in first!!");
  }
});

function gameCreate(name) {
  //TODO
  var gamedetail = { name: name, rating: 0, owned: 0 };
  var game = new Game(gamedetail);
  return game;
}

function userCreate(id, name) {
  var userdetail = {
    profile_id: id,
    name: name,
    games: [],
    lists: [],
  };
  var user = new User(userdetail);
  return user;
}

// Home page
router.get("/", (req, res) => {
  res.render("index", {
    appEnv: appEnv,
    redirect_uri: baseURL + "/users/callback",
  });
});

module.exports = router;
