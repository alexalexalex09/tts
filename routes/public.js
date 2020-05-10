const express = require("express");
const mysql = require("mysql");
const router = express.Router();
var cfenv = require("cfenv");
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
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

//Get current user's complete list object
router.post("/get_user_lists_populated", (req, res) => {
  if (req.user) {
    User.findOne({ profile_id: req.user.id })
      .populate("lists.allGames")
      .populate("lists.custom.games")
      .exec(function (err, curUser) {
        res.send(curUser.lists);
      });
  } else {
    res.send({ err: "Log in before populating user object" });
  }
});

//Get current user's  lists
router.post("/get_user_lists", (req, res) => {
  if (req.user) {
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      var resLists = curUser.lists.custom;
      var resArray = [];
      for (var i = 0; i < resLists.length; i++) {
        resArray.push(resLists[i].name);
      }
      //var resLists = ["Test List"];
      Array.prototype.unshift.apply(resArray, ["All Games"]);
      console.log(resArray);

      res.send(resArray);
    });
  } else {
    res.send({ err: "Log in first!!!" });
  }
});

//Get games from a user's single list
router.post("/get_user_list_games", (req, res) => {
  if (req.user) {
    User.findOne({ profile_id: req.user.id })
      .populate("lists.allGames")
      .exec(function (err, curUser) {});
  }
});

//Add a game to a user's "All Games" list
router.post("/game_add", function (req, res) {
  console.log("User: " + req.user.profile.firstName);
  if (req.user) {
    //Look up the game. If it doesn't exist, add it and add to user. If it does exist, add to user
    //First, get the game object, for now assuming the game exists. It's an array, so take the first element.
    console.log("User2: " + req.user.profile.firstName);
    var upsertOptions = { new: true, upsert: true };
    Game.findOneAndUpdate(
      {
        name: req.body.game,
      },
      { name: req.body.game },
      upsertOptions,
      function (err, game) {
        if (!game.rating) {
          game.rating = 0;
        }
        if (!game.owned) {
          game.owned = 0;
        }
        console.log(game);
        game.save().then(function (game) {
          User.findOneAndUpdate(
            {
              profile_id: req.user.id,
              name: req.user.profile.firstName,
            },
            { profile_id: req.user.id },
            upsertOptions,
            function (err, curUser) {
              //if game and user both exist, add the game unless it's already added
              function findGame(checkGame) {
                return checkGame.toString() == game._id.toString();
              }
              var gamesList = curUser.lists.allGames;
              theGame = gamesList.find(findGame);

              if (theGame) {
                //if it's already in the array, do nothing
                //Here's how to get the game's name
                Game.findById(theGame, "name", function (err, gameToReport) {
                  console.log("Game name: " + gameToReport.name);
                });
                res.send({ err: theGame + " has already been added" });
              } else {
                //if it's not, push it to the array and save the user
                res.send({ status: "adding game to user" });
                curUser.lists.allGames.push(game._id);
                curUser.save().then(function (theUser) {
                  //Here's how to get the game's name
                  Game.findById(theGame, "name", function (err, gameToReport) {
                    if (gameToReport) {
                      console.log("Game name: " + gameToReport.name);
                    }
                  });
                });
              }
            }
          );
        });
      }
    );
  } else {
    res.send({ err: "Log in first!!" });
  }
});

function gameCreate(name) {
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
