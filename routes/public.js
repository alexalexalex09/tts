require("dotenv").config();
const express = require("express");
const router = express.Router();
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
var User = require("../models/users.js");
var Game = require("../models/games.js");
var Session = require("../models/sessions.js");
var socketAPI = require("../socketAPI");
var Fuse = require("fuse.js");
const { response } = require("express");
const https = require("https");
const Resource = require("../models/resources.js");
var ManagementClient = require("auth0").ManagementClient;
var AuthenticationClient = require("auth0").AuthenticationClient;
var xml2js = require("xml2js");
var parser = new xml2js.Parser();

var management = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_NON_INTERACTIVE_CLIENT_ID,
  clientSecret: process.env.AUTH0_NON_INTERACTIVE_CLIENT_SECRET,
  scope: "read:users update:users",
});

var auth0 = new AuthenticationClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
});

const ERR_LOGIN = { err: "Log in first" };

var mongoDB = process.env.mongo;
console.log("Mongo: ", mongoDB);
mongoose.connect(mongoDB, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  w: "majority",
  family: 4,
});
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

function getBGGPage(pageNum) {
  var promise = new Promise(function (resolve, reject) {
    https.get(
      "https://boardgamegeek.com/browse/boardgame/page/" + pageNum,
      (resp) => {
        var data = "";

        // A chunk of data has been recieved.
        resp.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on("end", () => {
          data = data.toString();
          console.log(pageNum);
          var regexq = /(?<=boardgame.*?>)(.*?)(?=<)/g;
          var matches = data.match(regexq);
          var start = false;
          var ret = [];
          matches.forEach(function (e, i) {
            if (
              e != "" &&
              e != "Shop" &&
              start == true &&
              e.indexOf("&nbsp;") == -1 &&
              Number(e) != e &&
              !(e.substr(0, 1) == "[" && e.substr(e.length - 1, 1) == "]") &&
              e.indexOf("&laquo;") == -1 &&
              e.indexOf("&raquo;") == -1
            ) {
              if (e.indexOf("The") == 0) {
                ret.push({ name: e, rank: (pageNum - 1) * 50 + i });
                e = e.substr(4);
              }
              if (e.indexOf("A") == 0) {
                ret.push({ name: e, rank: (pageNum - 1) * 50 + i });
                e = e.substr(2);
              }
              if (e.indexOf("An") == 0) {
                ret.push({ name: e, rank: (pageNum - 1) * 50 + i });
                e = e.substr(3);
              }
              ret.push({ name: e, rank: (pageNum - 1) * 50 + i });
            }
            if (e == "Num Voters") {
              start = true;
            }
          });
          resolve(ret);
        });
      }
    );
  });
  return promise;
}
var topGames = [];
getBGGPage(1)
  .then((ret) => {
    topGames.push(ret);
    return getBGGPage(2);
  })
  .then((ret) => {
    topGames.push(ret);
    return getBGGPage(3);
  })
  .then((ret) => {
    topGames.push(ret);
    return getBGGPage(4);
  })
  .then((ret) => {
    topGames.push(ret);
    return getBGGPage(5);
  })
  .then((ret) => {
    topGames.push(ret);
    return getBGGPage(6);
  })
  .then((ret) => {
    topGames.push(ret);
    return getBGGPage(7);
  })
  .then((ret) => {
    topGames.push(ret);
    return getBGGPage(8);
  })
  .then((ret) => {
    topGames.push(ret);
    return getBGGPage(9);
  })
  .then((ret) => {
    topGames.push(ret);
    return getBGGPage(10);
  })
  .then((ret) => {
    topGames.push(ret);
    var count = 0;
    var newData = [];
    topGames.forEach(function (e) {
      count += e.length;
      e.forEach(function (el) {
        newData.push(el);
      });
    });
    console.log("length: ", count);
    Resource.findOne({ name: "topGames" }).exec(function (err, curResource) {
      if (curResource) {
        curResource.data = { games: newData };
        curResource.save();
      } else {
        var newResource = new Resource({
          name: "topGames",
          data: { games: newData },
        });
        newResource.save();
      }
    });
  });

/*
TopGame.findOne({ name: "topGames" }).exec(function (err, gameList) {
  var index = gameList.games.findIndex((obj) => {
    if (obj) {
      obj.rank == (pageNum - 1) * 50 + i;
    }
  });
  if (index == -1) {
    gameList.games[(pageNum - 1) * 50 + i] = { name: e, rank: i };
  } else {
    gameList.games[index].name = e;
  }
  gameList.update();
});
*/
function makeid(length) {
  //TODO: Filter out bad words
  var result = "";
  var characters = "ABCEGHJKLMNPQRTUVWXYZ0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

router.get("/j/:session", (req, res) => {
  console.log("Join called*********************");
  res.render("index", {
    sessionCode: req.params.session,
  });
});

// Home page
router.get("/", (req, res) => {
  console.log("query: ", req.query);
  console.log("req.session: ", req.session);
  if (typeof req.session.userNonce == "undefined") {
    req.session.userNonce = makeid(20);
  }
  if (typeof req.user != "undefined") {
    console.log("app_metadata: ", req.user.app_metadata);
    console.log(req.user);
  }
  socketAPI.sendNotification("Reloading...");
  res.render("index", {
    sessionCode: "none",
  });
});

// Get notified when the user is navigating back
router.post("/going_back", function (req, res) {
  console.log(req.body);
  if (req.body.from == "#postSelectView" && req.body.to == "#selectView") {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      var index = curSession.users.findIndex((obj) => obj.user == req.user.id);
      curSession.users[index].done = false;
      console.log(req.user.id, curSession.owner);
      console.log("lock: ", curSession.lock);
      curSession.lock = "#selectView";
      curSession.save().then(function (err, status) {
        socketAPI.addGame({ code: req.body.code });
        res.send({ status: "User editing again" });
      });
    });
  } else {
    res.send({
      status: "Thank you for traveling with TTS Airlines",
    });
  }
});

router.post("/get_session_post_select", (req, res) => {
  if (req.body.code) {
    socketAPI.addGame({ code: req.body.code });
  }
});

//Get current user's complete list object
router.post("/get_user_lists_populated", (req, res) => {
  if (req.user) {
    console.log("extUser: ", req.extUser);
    User.findOne({ profile_id: req.user.id })
      .populate("lists.allGames")
      .populate("lists.custom.games")
      .exec(function (err, curUser) {
        console.log("GULP curUser:", curUser);
        management.users.get({ id: req.user.user_id }, function (err, extUser) {
          console.log("auth0 user:", extUser);
          res.locals.user = req.user;
          if (
            extUser &&
            extUser.user_metadata &&
            extUser.user_metadata.userDefinedName != ""
          ) {
            var displayName =
              extUser.user_metadata.userDefinedName || req.user.displayName;
          } else {
            displayName = req.user.displayName;
          }
          console.log("DisplayName: ", displayName);
          if (curUser) {
            if (curUser.lists) {
              getSessions(req.user.id, curUser.lists, res);
            } else {
              newUser = {
                profile_id: req.user.id,
                name: displayName,
                lists: { allGames: [], custom: [] },
                bgg: { username: "", collection: [] },
              };
              curUser = new User(newUser);
              curUser.save().then(bggUpdate(curUser));
              getSessions(req.user.id, curUser.lists, res);
            }
          } else {
            newUser = {
              profile_id: req.user.id,
              name: displayName,
              lists: { allGames: [], custom: [] },
              bgg: { username: "", collection: [] },
            };
            curUser = new User(newUser);
            console.log("Creating New USER****");
            curUser.save().then(bggUpdate(curUser));
            getSessions(req.user.id, curUser.lists, res);
          }
        });
      });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/get_sessions", (req, res) => {
  if (req.user) {
    getSessions(req.user.id, "", res);
  } else {
    res.send(ERR_LOGIN);
  }
});

function getSessions(theId, lists, res) {
  Session.find({ owner: theId }).exec(function (err, curSessions) {
    var sessions = [];
    for (var i = 0; i < curSessions.length; i++) {
      sessions.push({
        code: curSessions[i].code,
        games: curSessions[i].games.length,
        users: curSessions[i].users.length,
      });
    }
    res.send({ lists: lists, sessions: sessions });
  });
}

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
    res.send(ERR_LOGIN);
  }
});

//Get games from a user's all games list
router.post("/get_user_all_games", (req, res) => {
  if (req.user) {
    User.findOne({ profile_id: req.user.id })
      .populate("lists.allGames")
      .exec(function (err, curUser) {
        res.send(curUser);
      });
  }
});

router.post("/game_add_bulk", function (req, res) {
  //req.body.games
  //req.body.listNum
  if (req.user) {
    if (req.body.games) {
      Game.find({ name: { $in: req.body.games } }).exec(function (
        err,
        curGames
      ) {
        console.log("Bulk add Games: ", curGames);
        console.log(req.body.games);
        var toAdd = [];
        req.body.games.forEach(function (e, i) {
          var index = curGames.findIndex((obj) => obj.name == e);
          if (index == -1) {
            toAdd.push({ name: req.body.games[i], rating: 0, owned: 0 });
          }
        });
        if (toAdd.length > 0) {
          toAdd.forEach(function (e) {
            curGames.push(e);
          });
          console.log("CurGames: ", typeof curGames, ": ", curGames);
          Game.insertMany(toAdd).then(function () {
            //doesnt work becuase its a collection of objects, not an object
            Game.find({ name: { $in: req.body.games } }).exec(function (
              err,
              curGames
            ) {
              User.findOne({ profile_id: req.user.id }).exec(function (
                err,
                curUser
              ) {
                curGames.forEach(function (e, i) {
                  var index = curUser.lists.allGames.findIndex(
                    (obj) => obj == curGames[i]._id
                  );
                  if (index == -1) {
                    curUser.lists.allGames.push(
                      mongoose.Types.ObjectId(curGames[i]._id)
                    );
                  }
                });
                if (req.body.list > 0) {
                  var list = req.body.list - 1;
                  curGames.forEach(function (e, i) {
                    var index = curUser.lists.custom[list].findIndex(
                      (obj) => obj == curGames[i]._id
                    );
                    if (index == -1) {
                      curUser.lists.custom[list].games.push(
                        mongoose.Types.ObjectId(curGames[i]._id)
                      );
                    }
                  });
                }
                curUser.save();
                res.send({ status: "Added bulk games: " + req.body.games });
              });
            });
          });
        } else {
          //no Games to Add
          User.findOne({ profile_id: req.user.id }).exec(function (
            err,
            curUser
          ) {
            curGames.forEach(function (e, i) {
              var index = curUser.lists.allGames.findIndex(
                (obj) => obj.toString() == curGames[i]._id.toString()
              );
              if (index == -1) {
                curUser.lists.allGames.push(
                  mongoose.Types.ObjectId(curGames[i]._id)
                );
              }
            });
            if (req.body.list > 0) {
              var list = req.body.list - 1;
              curGames.forEach(function (e, i) {
                var index = curUser.lists.custom[list].games.findIndex(
                  (obj) => obj.toString() == curGames[i]._id.toString()
                );
                if (index == -1) {
                  curUser.lists.custom[list].games.push(
                    mongoose.Types.ObjectId(curGames[i]._id)
                  );
                }
              });
            }
            curUser.save();
            console.log({ status: "Added bulk games: " + req.body.games });
            res.send({ status: "Added bulk games: " + req.body.games });
          });
        }
      });
    } else {
      console.log("No games submitted");
      res.send("No games submitted");
    }
  } else {
    console.log("Log in First");
    res.send(ERR_LOGIN);
  }
});

//Add a game to a user's "All Games" list
router.post("/game_add", function (req, res) {
  if (req.user) {
    if (req.body.game) {
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
              },
              { profile_id: req.user.id },
              upsertOptions,
              function (err, curUser) {
                //if game and user both exist, add the game unless it's already added
                function findGame(checkGame) {
                  return checkGame.toString() == game._id.toString();
                }
                var gamesList = curUser.lists.allGames;
                console.log(err);
                console.log(gamesList);
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
                  curUser.lists.allGames.push(game._id);
                  console.log("theGame: ", theGame);
                  curUser.save().then(function (theUser) {
                    Game.findById(game._id, "name", function (
                      err,
                      gameToReport
                    ) {
                      if (gameToReport) {
                        console.log("Game name: " + gameToReport.name);
                        res.send({ status: gameToReport });
                      } else {
                        res.send({
                          err:
                            "Error: game not added, maybe you checked too early.",
                        });
                      }
                      bggUpdate(curUser);
                    });
                  });
                }
              }
            );
          });
        }
      );
    } else {
      res.send({ err: "Cannot add blank game" });
    }
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/group_game_add", function (req, res) {
  if (req.user) {
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
          Session.findOne({ code: req.body.code }).exec(function (
            err,
            curSession
          ) {
            var index = curSession.games.findIndex(
              (obj) => obj.game == game._id.toString()
            );
            if (index > -1) {
              res.send({ err: "added", game: game._id.toString() });
            } else {
              curSession.votes.push({
                game: game._id,
                name: req.body.game,
                voters: [],
              });
              curSession.games.push({ game: game._id, addedBy: [req.user.id] });
              htmlString =
                `<li> <div class="editGame greenText">` +
                game.name +
                `</div>` +
                `<div class='toggle'>
                      <label class="switch">
                        <input type="checkbox" checked onclick="toggleEdit(this)" game_id="` +
                game._id +
                `">
                        <span class="slider round"></span>
                      </label>
              </div></li>`;
              curSession.save();
              res.send({ status: htmlString });
            }
          });
        });
      }
    );
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

router.post("/join_session", function (req, res) {
  var theCode = req.body.code.toUpperCase();
  theCode = theCode.replace("I", "1");
  theCode = theCode.replace("O", "0");
  Session.findOne({ code: theCode }).exec(function (err, curSession) {
    if (!curSession) {
      console.log("Error: ", err);
      console.log("Session: ", curSession);
      res.send({ err: "No such session" });
    } else {
      var lock = curSession.lock;
      if (req.user) {
        var sendGames = checkIfAddedByUser(curSession, req.user.id);
        if (curSession.owner == req.user.id) {
          //Join as owner
          var tosave = false;
          for (var i = 0; i < curSession.games.length; i++) {
            if (curSession.games[i].addedBy.length == 0) {
              curSession.games[i].addedBy = curSession.owner;
              tosave = true;
            }
            console.log(curSession.games[i], tosave);
            if (tosave) {
              curSession.save();
            }
          }
          socketAPI.sendNotification("Session already created...");
          socketAPI.addGame({
            code: curSession.code,
          });
          res.send({
            owned: true,
            status: {
              session: curSession,
              games: sendGames,
              user: req.user.id,
            },
          });
        } else {
          //Join as client
          var newUser = true; //Initialize to true, set to false if user is found
          if (lock == "#codeView") {
            lock = "#selectView";
          }
          for (var i = 0; i < curSession.users.length; i++) {
            //TODO: This could be changed to Array.findIndex
            if (curSession.users[i].user == req.user.id) {
              newUser = false;
              console.log(curSession.users[i]);
              if (curSession.users[i].done && lock == "#selectView") {
                lock = "#postSelectView";
              }
              if (curSession.users[i].doneVoting && lock == "#voteView") {
                lock = "#postVoteView";
              }
            }
          }
          console.log("newUser ", newUser);
          if (newUser) {
            var displayName = "";
            management.users.get({ id: req.user.user_id }, function (
              err,
              extUser
            ) {
              console.log("auth0 user:", extUser);
              res.locals.user = req.user;
              if (
                extUser &&
                extUser.user_metadata &&
                extUser.user_metadata.userDefinedName != ""
              ) {
                displayName =
                  extUser.user_metadata.userDefinedName || req.user.displayName;
                console.log("568DisplayName: ", displayName);
                curSession.users.push({
                  user: req.user.id,
                  name: displayName,
                  done: false,
                  doneVoting: false,
                });
                curSession.save().then(function () {
                  socketAPI.addGame({
                    code: theCode,
                  });
                  res.send({
                    owned: false,
                    status: {
                      code: curSession.code,
                      lock: lock,
                      games: sendGames,
                    },
                  });
                });
              }
            });
          } else {
            res.send({
              owned: false,
              status: {
                code: curSession.code,
                lock: lock,
                games: sendGames,
              },
            });
          }
        }
      } else {
        //Joining as guest. Not added to users or voting array
        res.send({
          owned: false,
          status: {
            code: curSession.code,
            lock: lock,
            games: [],
          },
        });
      }
    }
  });
});

function checkIfAddedByUser(theSession, userId) {
  var ret = [];
  console.log(theSession.games.length);
  for (var i = 0; i < theSession.games.length; i++) {
    function isAddedBy(toCheck) {
      return toCheck.toString() == userId;
    }
    if (theSession.games[i].addedBy.findIndex(isAddedBy) > -1) {
      ret.push(theSession.games[i]);
    }
  }
  return ret;
}

router.post("/create_session", function (req, res) {
  console.log(req.user);
  if (req.user) {
    var theCode = makeid(6);

    Session.findOne({ owner: req.user.id }).exec(function (err, curSession) {
      var theCode = makeid(5);
      var displayName = "";
      management.users.get({ id: req.user.user_id }, function (err, extUser) {
        console.log("auth0 user:", extUser);
        res.locals.user = req.user;
        if (
          extUser &&
          extUser.user_metadata &&
          extUser.user_metadata.userDefinedName != ""
        ) {
          displayName =
            extUser.user_metadata.userDefinedName || req.user.displayName;
        } else {
          displayName = req.user.displayName;
        }
        console.log("648DisplayName: ", displayName);
        var sessiondetail = {
          owner: req.user.id,
          code: theCode,
          games: [],
          users: [
            {
              user: req.user.id,
              name: displayName,
              done: false,
            },
          ],
          lock: "#codeView",
        };
        var session = new Session(sessiondetail);
        session.save().then(function (theSession) {
          console.log("Session created...");
          socketAPI.addGame({
            code: theCode,
          });
          res.send({
            owned: true,
            status: { session: theSession, user: req.user.id },
          });
        });
      });
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/add_game_to_session", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      var results = [];

      if (req.body.gamesToAdd.length > 0) {
        for (var i = 0; i < req.body.gamesToAdd.length; i++) {
          var numGames = 0;
          //1. Has the game already been added to the session?
          //2. Is the user's id already in the list of owners?
          var id = mongoose.Types.ObjectId(req.body.gamesToAdd[i]);
          var gameAdded = false;
          var ownedBy = false;
          var index = -1;
          for (var j = 0; j < curSession.games.length; j++) {
            if (curSession.games[j].game.toString() == req.body.gamesToAdd[i]) {
              gameAdded = true;
              index = j;
              if (curSession.games[j].addedBy.includes(req.user.id)) {
                ownedBy = true;
                console.log(numGames);
              }
            }
            if (curSession.games[j].addedBy.includes(req.user.id)) {
              numGames++;
            }
          }
          if (gameAdded) {
            if (ownedBy) {
              results.push({ err: "Already added by this user" });
            } else {
              console.log(numGames);
              curSession.games[index].addedBy.push(req.user.id);
              results.push({
                status:
                  "Added " +
                  req.user.id +
                  " to the list of owners for " +
                  req.body.gamesToAdd[i],
              });
              socketAPI.sendNotification(
                "A user added a game that someone else already added..." +
                  numGames
              );
            }
          } else {
            curSession.games.push({ game: id, addedBy: [req.user.id] });
            results.push({
              status:
                "Added " +
                req.body.gamesToAdd[i] +
                "to the list with owner " +
                req.user.id,
            });
            socketAPI.sendNotification("A user added a new game..." + numGames);
          }
        }

        curSession.save().then(function () {
          socketAPI.addGame({
            code: req.body.code,
            games: curSession.games,
          });
        });
        res.send(results);
      } else {
        if (req.body.gamesToRemove.length > 0) {
          console.log("gamesToRemove: ", req.body.gamesToRemove);
          //Find the game to remove, then remove the owner from the addedBy array
          for (var i = 0; i < req.body.gamesToRemove.length; i++) {
            var numGames = 0;
            var gameAdded = false;
            var ownedBy = false;
            var index = -1;
            var game = curSession.games.findIndex(
              (obj) => obj.game.toString() == req.body.gamesToRemove[i]
            );
            console.log("game: ", game);
            if (game > -1) {
              console.log(curSession.games[game]);
              var toRemove = curSession.games[game].addedBy.findIndex(
                (obj) => obj == req.user.id
              );
              //console.log("toRemove: ", toRemove);
              if (toRemove > -1) {
                curSession.games[game].addedBy.splice(toRemove, 1);
                if (curSession.games[game].addedBy.length == 0) {
                  curSession.games.splice(game, 1);
                }
                socketAPI.sendNotification("A user removed a game...");
              }
            }
          }
          for (var i = 0; i < curSession.games.length; i++) {
            console.log(
              curSession.games[i].addedBy[0],
              "|",
              req.user.id.toString()
            );
            if (
              curSession.games[i].addedBy.findIndex(
                (obj) => obj == req.user.id.toString()
              ) > -1
            ) {
              numGames++;
            }
          }
          console.log("numGamestoRemove: ", numGames);
          console.log(req.body.gamesToRemove);
          curSession.save().then(function () {
            socketAPI.addGame({
              code: req.body.code,
              games: curSession.games,
            });
          });
        }
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/submit_games", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      socketAPI.sendNotification("A user finished adding games...");
      var index = curSession.users.findIndex((obj) => obj.user == req.user.id);
      curSession.users[index].done = true;
      curSession.save().then(function () {
        socketAPI.addGame({ code: req.body.code });
      });
      if (curSession.owner == req.user.id.toString()) {
        var htmlString =
          '<div id="postSelectLoadingMessage"><p>There are ' +
          curSession.users.length +
          " users connected:</p>";
        for (var i = 0; i < curSession.users.length; i++) {
          htmlString += "<p>" + curSession.users[i] + "</p>";
        }
        res.send({ status: htmlString });
      } else {
        var htmlString = `
        <img class="loader" src="/img/loading.gif">
        <div class="loadingMessage" id="postSelectLoadingMessage">Please wait...</div>
        `;
        res.send({ status: htmlString });
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/lock_games", function (req, res) {
  /* This whole function needs to be rethought. The idea is that it does the following:
    1. Look through the list of games in the session and see if any need added to the voting array
    2. Pass the name, id, and active status of each game in the voting array within the htmlString output
      2a. To do that, we need to get the name of each game from the Games collection
      2b. We also need to learn whether it's a dupe
    Note: Once added, you can't remove a game from the voting array

  */
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      var namesList = [];
      var votes = curSession.votes;
      curSession.votes = [];
      socketAPI.lockGames({ code: req.body.code });
      //To set up, set every vote to inactive
      for (var i = 0; i < votes.length; i++) {
        votes[i].active = false;
      }
      console.log("votes:", votes);
      //First, look through the list of games and see if any haven't been added to the vote array, add them to namesList[]
      for (var i = 0; i < curSession.games.length; i++) {
        //If the game has actually been added
        console.log("game" + i, curSession.games[i].game);
        if (curSession.games[i].addedBy.length > 0) {
          var index = votes.findIndex(
            (obj) => obj.game.toString() == curSession.games[i].game.toString()
          );
          if (index == -1) {
            //If it's not in the votes array, get ready to add it
            namesList.push(mongoose.Types.ObjectId(curSession.games[i].game));
          } else {
            //If it's both been added by at least one person and it's already in the votes array
            votes[index].active = true;
          }
        }
      }
      //Then, take all the namesList games and add their names and ids to the vote array
      Game.find({ _id: { $in: namesList } }).exec(function (err, games) {
        curSession.votes = votes;
        //Right now, games is getting every game instead of just the ones that were newly added
        for (var i = 0; i < games.length; i++) {
          curSession.votes.push({
            game: games[i]._id,
            name: games[i].name,
            voters: [],
            active: true,
          });
        }
        const options = { keys: ["name"], includeScore: true };
        const fuse = new Fuse(curSession.votes, options);
        var htmlString =
          `<div class="button lightGreyBtn" id="gameUnlock" type="submit">Unlock Game List</div>` +
          `<div id="addGroupGamesContainer">` +
          `<div id="addGroupGamesTitle">Add Games to Session:</div>` +
          `<div class="textInputCont" id="addGroupGamesInputCont">` +
          `<form onsubmit='return addGroupGame()'>` +
          `<input class="textInput" type="text" id="addGroupGamesInput">` +
          `<input class="textSubmit" type="submit" value=""></input>` +
          `</form>` +
          `</div>` +
          `</div>` +
          `<div class="tip" id="dupTip">Potential duplicates are highlighted in gold</div>` +
          `<div id="editGameList">`;
        var checked = "";
        var green = "";
        for (var i = 0; i < curSession.votes.length; i++) {
          curSession.votes[i].active ? (checked = " checked") : (checked = "");
          curSession.votes[i].active ? (green = " greenText") : (green = "");
          htmlString +=
            `<li` +
            dupeSearch(fuse, curSession.votes[i]) +
            /*
             *
             *
             * TODO: Green text overrides the dup yellow, and it probably shouldn't
             *
             *
             *
             */
            `><div class="editGame` +
            green +
            `">` +
            curSession.votes[i].name +
            `</div>` +
            `<div class='toggle'>
          <label class="switch">
              <input type="checkbox"` +
            checked +
            ` onclick="toggleEdit(this)" game_id="` +
            curSession.votes[i].game +
            `">
              <span class="slider round"></span>
          </label>
      </div></li>`;
        }

        htmlString +=
          `</div>` +
          `<div class="button greenBtn bottomBtn" id="editGameSubmit">Begin Voting</div>`;
        curSession.save();
        res.send({ status: "locked games", htmlString: htmlString });
      });
    });
  } else {
    res.send(ERR_LOGIN);
  }

  function dupeSearch(fuse, vote) {
    vote.dup = "";
    var searchres = fuse.search(vote.name);
    //console.log(vote.name, Object.keys(searchres).length, searchres);
    for (let key in searchres) {
      if (searchres[key].score > 0.4) {
        delete searchres[key];
      }
    }
    if (Object.keys(searchres).length > 1) {
      //console.log("Dupe!");
      //console.log(searchres);
      return ' class="dup"';
    } else {
      return "";
    }
  }
});

//Hey wait, what does this modify? The owner's game list or the session game list? And when?
router.post("/modify_edit_list", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      if (typeof curSession.votes == "undefined") {
        curSession.votes = [];
      }
      if (req.body.gamesToAdd.length > 0) {
        for (var i = 0; i < req.body.gamesToAdd.length; i++) {
          var index = curSession.games.findIndex(
            (obj) => obj.game.toString() == req.body.gamesToAdd[i]
          );
          if (index > -1) {
            var indexa = curSession.votes.findIndex(
              (obj) => obj.game.toString() == req.body.gamesToAdd[i]
            );
            if (indexa == -1) {
              //If the game has already been removed from voting array, add it back
              curSession.votes.push({
                game: mongoose.Types.ObjectId(req.body.gamesToAdd[i]),
                voters: [],
                active: true,
              });
            } else {
              curSession.votes[indexa].active = true;
            }
          } else {
            res.send({
              err: "Couldn't find game to add: " + req.body.gamesToAdd[i],
            });
          }
        }
      } else {
        if (req.body.gamesToRemove.length > 0) {
          console.log("removing...", req.body.gamesToRemove);
          for (var i = 0; i < req.body.gamesToRemove.length; i++) {
            var index = curSession.games.findIndex(
              (obj) => obj.game.toString() == req.body.gamesToRemove[i]
            );
            if (index > -1) {
              console.log("Game was in the games array");
              var indexa = curSession.votes.findIndex(
                (obj) => obj.game.toString() == req.body.gamesToRemove[i]
              );
              if (indexa > -1) {
                console.log("Game was in the votes array");
                curSession.votes[indexa].active = false; //Remove the item from voting consideration
              }
              console.log(indexa, " Removed: ", curSession.games[index]);
            } else {
              res.send({
                err:
                  "Couldn't find game to remove: " + req.body.gamesToRemove[i],
              });
            }
          }
        } else {
          res.send({ err: "No games to add or remove passed" });
        }
      }
      curSession.save().then(function (error, result, numRows) {
        console.log("Error: ", error);
        var gameList = [];
        var ret = [];
        for (var i = 0; i < curSession.games.length; i++) {
          gameList.push(mongoose.Types.ObjectId(curSession.games[i].game));
        }
        Game.find({ _id: { $in: gameList } }).exec(function (err, games) {
          for (var i = 0; i < games.length; i++) {
            ret[i] = { name: games[i].name, id: games[i]._id };
          }
          res.send({ status: ret });
        });
      });
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/unlock_games", function (req, res) {
  if (req.user) {
    var data = {
      code: req.body.code,
      unlock: req.body.unlock,
      user: req.user.id,
    };

    socketAPI.unlockGames(data);
    res.send({ status: "Unlocking..." });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/start_voting", function (req, res) {
  //if (req.user) {
  //Send the voting socket event to both client and owner
  socketAPI.startVoting(req.body);
  res.send({ status: "Started voting!" });
  //} else {
  //  res.send(ERR_LOGIN);
  //}
});

router.post("/submit_votes", function (req, res) {
  if (req.user) {
    //Send the voting socket event to both client and owner
    socketAPI.submitVotes({
      code: req.body.code,
      user: req.user.id,
      voteArray: req.body.voteArray,
    });
    res.send({ status: "Submitted votes!" });
  } else {
    socketAPI.submitVotes({
      code: req.body.code,
      user: "guest" + req.session.userNonce,
      voteArray: req.body.voteArray,
    });
    res.send({ status: "Submitted votes!" });
  }
});

router.post("/get_votes", function (req, res) {
  //if (req.user) {
  var games = [];
  console.log(req.body);
  Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
    for (var i = 0; i < curSession.votes.length; i++) {
      if (curSession.votes[i].active) {
        games.push({
          game: curSession.votes[i].game,
          name: curSession.votes[i].name,
        });
      }
    }
    res.send({ games: games });
  });
  //} else {
  //  res.send(ERR_LOGIN);
  //}
});

function sortDescByKey(array, key) {
  return array.sort(function (a, b) {
    var x = a[key];
    var y = b[key];
    return x < y ? 1 : x > y ? -1 : 0;
  });
}

router.post("/end_vote", function (req, res) {
  if (req.user) {
    console.log(req.body.code);
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      var games = [];
      for (var i = 0; i < curSession.votes.length; i++) {
        if (curSession.votes[i].active) {
          games[i] = { name: curSession.votes[i].name, votes: 0 };
          for (var j = 0; j < curSession.votes[i].voters.length; j++) {
            games[i].votes += curSession.votes[i].voters[j].vote;
          }
        }
      }
      console.log("games unsorted:", games);
      games = sortDescByKey(games, "votes");
      console.log("games:", games);
      socketAPI.endVote({ games: games, code: req.body.code });
      curSession.lock = "#playView";
      curSession.save();
      res.send({ status: "Vote ended for " + req.body.code });
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/get_games", function (req, res) {
  //if (req.user) {
  Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
    var games = [];
    for (var i = 0; i < curSession.votes.length; i++) {
      games[i] = { name: curSession.votes[i].name, votes: 0 };
      for (var j = 0; j < curSession.votes[i].voters.length; j++) {
        games[i].votes += curSession.votes[i].voters[j].vote;
      }
    }
    games.sort(function (a, b) {
      var x = a.votes;
      var y = b.votes;
      return x < y ? 1 : x > y ? -1 : 0;
    });
    res.send({ games: games });
  });
  //} else {
  //res.send(ERR_LOGIN);
  //}
});

router.post("/move_to_list", function (req, res) {
  if (req.user) {
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      var fromList = Number(req.body.fromList.substr(5)) - 1;
      var errors = 0;
      var ret = [];
      if (fromList == -1) {
        res.send({ err: "Can't move to or from your All Games list" });
      }
      var toList = Number(req.body.toList.substr(5)) - 1;
      if (toList == -1) {
        res.send({ err: "Can't move to or from your All Games list" });
      }
      console.log(req.body.games);
      req.body.games.forEach(function (e, i) {
        var index = curUser.lists.custom[fromList].games.findIndex(
          (obj) => obj.toString() == e
        );
        var gameToMove = curUser.lists.custom[fromList].games.splice(index, 1);

        if (
          curUser.lists.custom[toList].games.findIndex(
            (obj) => obj == gameToMove[0].toString()
          ) == -1
        ) {
          curUser.lists.custom[toList].games.push(gameToMove);
          ret.push(gameToMove);
        } else {
          errors++;
        }
      });
      curUser.save().then(bggUpdate(curUser));
      res.send({ status: curUser, errors: errors, ret: ret });
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/copy_to_list", function (req, res) {
  if (req.user) {
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      var toList = Number(req.body.toList.substr(5)) - 1;
      var fromList = Number(req.body.fromList.substr(5)) - 1;
      if (toList == -1) {
        res.send({ err: "Can't copy to your All Games list" });
      } else {
        var errors = 0;
        req.body.games.forEach(function (e, i) {
          console.log("current item: ", e);
          if (fromList == -1) {
            var index = curUser.lists.allGames.findIndex(
              (obj) => obj.toString() == e
            );
            var gameToCopy = curUser.lists.allGames[index];
          } else {
            var index = curUser.lists.custom[fromList].games.findIndex(
              (obj) => obj.toString() == e
            );
            var gameToCopy = curUser.lists.custom[fromList].games[index];
          }
          console.log(curUser.lists.custom[toList].games, gameToCopy);
          if (
            curUser.lists.custom[toList].games.findIndex(
              (obj) => obj == gameToCopy.toString()
            ) == -1
          ) {
            curUser.lists.custom[toList].games.push(gameToCopy);
          } else {
            errors++;
          }
        });
        curUser.save().then(bggUpdate(curUser));
        res.send({ status: curUser, errors: errors });
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/rename_game", function (req, res) {
  if (req.user) {
    if (req.body.newName) {
      User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
        Game.findOne({ name: req.body.newName }).exec(function (err, curGame) {
          if (curGame == null) {
            console.log("CurGame is null: ", curGame);
            Game.updateOne(
              { name: req.body.newName },
              { name: req.body.newName },
              { upsert: true },
              function (err, newGame) {
                console.log(err, "|", newGame);
                //Splice the new game in the user doc in place of the old game at all the right places
                replaceInUserDoc(
                  req.body.game,
                  curUser,
                  newGame.upserted[0]._id.toString()
                );
                //The user now has a brand new game with a new name but everything else the exact same
                //The advantage is that if the renamed game exists, the system can reference that game
                //rather than having a game that references an object that doesn't share its name
                curUser.save().then(bggUpdate(curUser));
                res.send({ status: "Success" });
                //Save the user, the game has already been saved under pushToGamesDocAndSave
              }
            );
          } else {
            //Game already exists
            console.log("req.body: ", req.body);
            console.log("curGame: ", curGame);
            //**Get the game meta info from the user (currently not there!)
            //**var gameMeta = getGameMeta(curUser, req.body.game);
            //
            //Test the game to see if it's already in the user's lists anywhere.
            //If so, don't allow the update because it will conflate two games
            var repeat = false;
            curUser.lists.allGames.some(function (e) {
              if (e.toString() == curGame._id.toString()) {
                repeat = true;
                return repeat;
              }
            });
            if (!repeat) {
              curUser.lists.custom.forEach(function (e) {
                e.games.some(function (f) {
                  console.log(f.toString(), curGame._id.toString());
                  if (f.toString() == curGame._id.toString()) {
                    repeat = true;
                    return repeat;
                  }
                });
              });
            }
            if (repeat) {
              res.send({
                err:
                  "Game " +
                  req.body.newName +
                  " is already in one of your lists",
              });
            } else {
              replaceInUserDoc(req.body.game, curUser, curGame._id.toString());
              curUser.save().then(bggUpdate(curUser));
              res.send({ status: "Success" });
            }
          }
        });
      });
    } else {
      res.send({ err: "Blank game name is not allowed" });
    }
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/rename_list", function (req, res) {
  if (req.user) {
    if (req.body.newName) {
      User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
        var listNum = Number(req.body.list) - 1;
        if (listNum == -1) {
          res.send({ err: "Can't rename All Games" });
        } else {
          curUser.lists.custom[listNum].name = req.body.newName;
          curUser.save();
          res.send({ status: "Success" });
        }
      });
    } else {
      res.send({ err: "Blank game name is not allowed" });
    }
  } else {
    res.send(ERR_LOGIN);
  }
});

function replaceInUserDoc(game, curUser, newGame) {
  console.log("CurGame: ", game);
  console.log("CurUser: ", curUser);
  console.log(curUser.lists.allGames.findIndex((obj) => obj == game));
  if (typeof newGame == "undefined") {
    console.log("Will remove");
    curUser.lists.allGames.splice(
      curUser.lists.allGames.findIndex((obj) => obj == game),
      1
    );
    console.log(
      "Removing ",
      curUser.lists.allGames.findIndex((obj) => obj == game)
    );
  } else {
    curUser.lists.allGames.splice(
      curUser.lists.allGames.findIndex((obj) => obj == game),
      1,
      newGame
    );
  }
  for (var i = 0; i < curUser.lists.custom.length; i++) {
    if (typeof newGame == "undefined") {
      curUser.lists.custom[i].games.splice(
        curUser.lists.custom[i].games.findIndex((obj) => obj == game),
        1
      );
    } else {
      curUser.lists.custom[i].games.splice(
        curUser.lists.custom[i].games.findIndex((obj) => obj == game),
        1,
        newGame
      );
    }
  }
}

router.post("/delete_game", function (req, res) {
  if (req.user) {
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      //use this function to delete all instances of the game in a user instead of replacing by not passing a string
      var ret = [];
      req.body.games.forEach(function (e, i) {
        console.log("Deleting: ", e.name);
        replaceInUserDoc(e.id, curUser);
        ret.push(e);
      });
      curUser.save();
      res.send({ status: "Success", arr: ret });
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/delete_list", function (req, res) {
  if (req.user) {
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      var listNum = Number(req.body.list.substr(4)) - 1;
      if (listNum == -1) {
        res.send({ err: "Can't delete All Games" });
      } else {
        curUser.lists.custom.splice(listNum);
        curUser.save();
        res.send({ status: "Success" });
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/remove_game", function (req, res) {
  if (req.user) {
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      var ret = [];
      console.log("gamesarr", req.body.games);
      req.body.games.forEach(function (e) {
        console.log(Number(e.list)); //wrong number!
        console.log(curUser.lists.custom);
        var index = curUser.lists.custom[Number(e.list) - 1].games.findIndex(
          (obj) => obj._id.toString() == e.game
        );
        curUser.lists.custom[e.list - 1].games.splice(index, 1);
        ret.push(e.name);
      });
      curUser.save();
      res.send({ status: "Success", arr: ret });
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/list_add", function (req, res) {
  if (req.user) {
    if (req.body.list) {
      User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
        var index = curUser.lists.custom.findIndex(
          (obj) => obj.name == req.body.list
        );
        if (index == -1) {
          curUser.lists.custom.push({ name: req.body.list, games: [] });
          curUser.save();
          res.send({ status: "Success" });
        } else {
          res.send({ err: "Already added a list with this name" });
        }
      });
    } else {
      res.send({ err: "Cannot add empty list" });
    }
  }
});

router.post("/reset_password", function (req, res) {
  console.log(req.user.emails[0].value);
  if (req.user.emails[0].value) {
    var data = {
      email: req.user.emails[0].value,
      connection: "Username-Password-Authentication",
      client_id: process.env.AUTH0_CLIENT_ID,
    };
    console.log(data);
    console.log(auth0.requestChangePasswordEmail);
    auth0.requestChangePasswordEmail(data, function (err, message) {
      if (err) {
        console.log("PwdReset Error: ", err);
      }

      res.send({
        status:
          "If there is an account on file for " +
          req.body.email +
          ", a password reset email has been sent",
      });
    });
  } else {
    res.send({ err: "No email on file for user" });
  }
});

router.post("/change_username", function (req, res) {
  var params = { id: req.user.id };
  var metadata = { userDefinedName: req.body.newName };
  console.log("Changing username: ", params, metadata);
  management.users.updateUserMetadata(params, metadata, function (err, user) {
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      curUser.name = req.body.newName;
      curUser.save();
      console.log("Username changed to ", req.body.newName);
      if (err) {
        // Handle error.
        res.send({ err: "Username update error: ", err });
      } else {
        // Updated user.
        res.send({ status: "Success", name: req.body.newName });
      }
    });
  });
});

router.post("/get_top_list", function (req, res) {
  Resource.findOne({ name: "topGames" }).exec(function (err, curResource) {
    if (curResource) {
      var ret = [];
      curResource.data.games.forEach(function (e) {
        ret.push(e.name);
      });
      res.send({ games: ret });
    }
  });
});

router.post("/connect_bgg", function (req, res) {
  if (req.user) {
    console.log("Connecting " + req.user.id);
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      if (curUser) {
        curUser.bgg.username = req.body.username;
        bggUpdate(curUser).then(
          function (user) {
            res.send({ status: "Got games for " + user.bgg.username });
          },
          function (err) {
            res.send({ err: err });
          }
        );
      } else {
        res.send({ err: "No user" });
      }
    });
  } else {
    res.send({ err: "log in" });
  }
});

router.post("/check_bgg", function (req, res) {
  if (req.user) {
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      if (curUser) {
        if (
          typeof curUser == "undefined" ||
          typeof curUser.bgg == "undefined" ||
          curUser.bgg.username == ""
        ) {
          res.send({ err: "No BGG User" });
        } else {
          res.send({ success: curUser.bgg.collection });
        }
      } else {
        res.send({ err: "No user" });
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

function bggUpdate(curUser) {
  var promise = new Promise(function (resolve, reject) {
    if (curUser.bgg.username != "") {
      https.get(
        "https://api.geekdo.com/xmlapi2/collection?username=" +
          curUser.bgg.username +
          "&stats=1",
        (resp) => {
          var data = "";

          // A chunk of data has been recieved.
          resp.on("data", (chunk) => {
            data += chunk;
          });

          // The whole response has been received. Print out the result.
          resp.on("end", () => {
            data = data.toString();
            parser.parseString(data, function (err, result) {
              if (result.errors) {
                reject(result.errors.error[0].message[0]);
              } else {
                var arr = [];
                if (result["items"]) {
                  for (var i = 0; i < result["items"].$.totalitems; i++) {
                    /*console.log(i, ": ", result["items"].item[i]);
                  console.log("name: ", result["items"].item[i].name);
                  console.log("stats: ", result["items"].item[i].stats);
                  console.log(
                    "rating: ",
                    result["items"].item[i].stats[0].rating
                  );
                  console.log(
                    "Rating is " + typeof result["items"].item[i].stats[0].rating
                  );
                  if (result["items"].item[i].stats[0].rating) {
                    console.log(
                      "ranks: ",
                      result["items"].item[i].stats[0].rating[0].ranks[0].rank
                    );
                  }
                  console.log("status: ", result["items"].item[i].status);*/
                    var g = result["items"].item[i];
                    var s = g.stats[0];
                    var toAdd = {};
                    toAdd.name = g.name[0]._;
                    toAdd.id = g.$.objectid;
                    toAdd.image = g.thumbnail[0];
                    if (s) {
                      toAdd.minplayers = s.$.minplayers;
                      toAdd.maxplayers = s.$.maxplayers;
                      toAdd.minplaytime = s.$.minplaytime;
                      toAdd.maxplaytime = s.$.maxplaytime;
                      toAdd.playingtime = s.$.playingtime;
                      if (s.rating && s.rating[0].rank) {
                        console.log(Rank);
                      }
                      if (
                        s.rating &&
                        s.rating[0].ranks &&
                        s.rating[0].ranks[0].rank[0] &&
                        s.rating[0].ranks[0].rank[0].$ &&
                        Number(s.rating[0].ranks[0].rank[0].$.value) ==
                          Number(s.rating[0].ranks[0].rank[0].$.value)
                      ) {
                        toAdd.rank = s.rating[0].ranks[0].rank[0].$.value;
                      }
                      if (
                        s.rating &&
                        s.rating[0].ranks &&
                        s.rating[0].ranks[0].rank[1] &&
                        s.rating[0].ranks[0].rank[1].$ &&
                        Number(s.rating[0].ranks[0].rank[1].$.name) ==
                          Number(s.rating[0].ranks[0].rank[1].$.name)
                      ) {
                        toAdd.family = s.rating[0].ranks[0].rank[1].$.name;
                      }
                    }

                    if (g.status[0]) {
                      toAdd.own = g.status[0].$.own;
                      toAdd.want = g.status[0].$.want;
                      toAdd.wanttoplay = g.status[0].$.wanttoplay;
                      toAdd.wanttobuy = g.status[0].$.wanttobuy;
                      toAdd.wishlist = g.status[0].$.wishlist;
                    }
                    toAdd.plays = g.numplays[0];

                    if (result["items"].item[i].stats.rating) {
                      stats.rating = g.stats.rating.average;
                    }
                    arr.push(toAdd);
                  }
                  //console.log("The Array: ", arr);
                  User.findOne({ profile_id: curUser.profile_id }).exec(
                    function (err, updatedUser) {
                      if (updatedUser) {
                        updatedUser = curUser;
                        updatedUser.bgg.collection = arr;
                        updatedUser.save();
                        console.log("BGGUpdate Finished");
                        resolve(updatedUser);
                      } else {
                        reject("Invalid user " + curUser.profile_id);
                      }
                    }
                  );
                } else {
                  reject("No response", result);
                }
              }
            });
          });
        }
      );
    } else {
      reject("No username");
    }
  });
  return promise;
}

module.exports = router;
