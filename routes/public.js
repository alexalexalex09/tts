require("dotenv").config();
console.log("Starting...");
var loadTime = Date.now();
const express = require("express");
const router = express.Router();
var mongoose = require("mongoose");
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
var User = require("../models/users.js");
var Game = require("../models/games.js");
var Session = require("../models/sessions.js");
var Stat = require("../models/stats.js");
var socketAPI = require("../socketAPI");
var Fuse = require("fuse.js");
const { response } = require("express");
const https = require("https");
const Resource = require("../models/resources.js");
var ManagementClient = require("auth0").ManagementClient;
var AuthenticationClient = require("auth0").AuthenticationClient;
var xml2js = require("xml2js");
var parser = new xml2js.Parser();
const Readable = require("readable-url");

console.log("1/8: Setting up Auth0", Date.now() - loadTime);
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
const ERR_LOGIN_SOFT = { err: "No user" };
const ERR_CODE = { err: "Session not found" };

console.log("2/8: Connecting Mongoose", Date.now() - loadTime);
var mongoDB = process.env.mongo;
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

console.log("3/8: Cleaning database", Date.now() - loadTime);
Game.find({ name: /'/ }).exec(function (err, curGames) {
  curGames.forEach(function (e, i) {
    curGames[i].name = e.name.replace(/([^\\])'/g, `$1\\'`);
    curGames[i].save();
  });
});

Session.find({ users: { $elemMatch: { user: { $regex: /guest*/ } } } }).exec(
  function (err, curSessions) {
    var totalSave = 0;
    curSessions.forEach(function (e, i) {
      var toSave = false;
      curSessions[i].users.forEach(function (el, ind) {
        var user = curSessions[i].users[ind].user;
        if (user.substr(0, 5) == "guest" && user.length == 25) {
          curSessions[i].users.splice(ind, 1);
          totalSave++;
          toSave = true;
        }
      });
      if (toSave) {
        curSessions[i].save();
      }
    });
    if (totalSave) {
      console.log("Removed " + totalSave + " guest user(s)");
    }
  }
);

/*
User.findOne({ name: "crina" }).exec(function (err, curUser) {
  console.log(curUser);
  Game.find({ _id: { $in: curUser.lists.allGames } }).exec(function (
    err,
    curGames
  ) {
    var arr = [];
    curGames.forEach(function (e) {
      arr.push(e.name + ": " + e._id);
    });
    console.log("Games: ", arr);
  });
});
*/

/* Async BGG Function Definitions */
function getBGGPage(pageNum) {
  var promise = new Promise(function (resolve, reject) {
    if (pageNum <= 10) {
      pageNum = (pageNum - 1) * 100;
      https.get(
        "https://api.boardgameatlas.com/api/search?client_id=" +
          process.env.BGAID +
          "&limit=100&skip=" +
          pageNum,
        (resp) => {
          var data = "";

          // A chunk of data has been recieved.
          resp.on("data", (chunk) => {
            data += chunk;
          });

          // The whole response has been received. Print out the result.
          resp.on("end", () => {
            //console.log(result);
            result = JSON.parse(data);
            var ret = [];
            if (result.games) {
              result.games.forEach((game) => {
                if (game.id.length > 0) {
                  var name = game.name;
                  var article = 0;
                  if (name.indexOf("The ") == 0) {
                    article = 4;
                  }
                  if (name.indexOf("A ") == 0) {
                    article = 2;
                  }
                  if (name.indexOf("An ") == 0) {
                    article = 3;
                  }
                  game.noarticle = name.substr(article);
                  ret.push(game);
                }
              });
              resolve(ret);
            } else {
              reject({ BGAPageErr: result, pageNum: pageNum });
            }
          });
        }
      );
    } else {
      resolve([]);
    }
  });

  return promise;
}

async function getBGGPages(numPages) {
  var arr = [];
  for (var i = 1; i < numPages + 1; i++) {
    var ret = await getBGGPage(i);
    arr = arr.concat(ret);
    console.log("getBGAPage " + Math.floor((i / numPages) * 100) + "%");
  }
  return arr;
}

async function getBGGMetaDatas(topGames) {
  var newData = [];
  for (var i = 0; i < topGames.length; i++) {
    var e = topGames[i];
    //count += e.length;
    var ids = "";
    var toAdd = [];
    e.forEach(function (el) {
      toAdd.push(el);
      ids += el.bggID + ",";
    });
    ids = ids.substr(0, ids.length - 1);
    console.log(
      "getBGGMetaData " + Math.floor((i / topGames.length) * 100) + "%"
    );
    toAdd = await getBGGMetaData(ids, toAdd);
    toAdd.forEach(function (ele) {
      newData.push(ele);
    });
  }
  return newData;
}

function getBGGMetaData(ids, toAdd) {
  var promise = new Promise(function (resolve, reject) {
    https.get(
      "https://api.boardgameatlas.com/api/search?client_id=" +
        process.env.BGAID +
        "&id=" +
        ids,

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
            //console.log(result);
            if (result.errors) {
              reject({ err: result.errors });
            } else {
              var arr = [];
              if (result.items.item) {
                for (var i = 0; i < result.items.item.length; i++) {
                  toAdd[i].minplayers =
                    result.items.item[i].minplayers[0].$.value;
                  toAdd[i].maxplayers =
                    result.items.item[i].maxplayers[0].$.value;
                }
                resolve(toAdd);
              } else {
                reject({ err: "255: Nothing returned", items: result.items });
              }
            }
          });
        });
      }
    );
  });
  return promise;
}

//TODO: Modify this to only update the list with new data, and not overwrite custom additions
/*Use Async BGG Functions to get top list of games with metadata */
console.log("4/8: Loading cached games", Date.now() - loadTime);
Resource.findOne({ name: "topGames" }).exec(function (err, curResource) {
  console.log("7/8: Loaded cached games", Date.now() - loadTime);
  if (curResource) {
    if (isNaN(curResource.collected)) {
      resourceOutdated = true;
    } else {
      resourceOutdated =
        Date.now() - curResource.collected > 1000 * 60 * 60 * 24 * 7; // Wait 7 days = 1000*60*60*24*7
      //resourceOutdated = true; //Force update
    }
  } else {
    resourceOutdated = true;
  }
  if (resourceOutdated) {
    getBGGPages(10).then((topGames) => {
      if (curResource) {
        //Don't wholesale replace, instead do an upgrade
        var games = curResource.data.games;
        for (let i = 0; i < topGames.length; i++) {
          //If the current index happens to be the same as the old index, don't overthink it, just replace
          if (games[i].name == topGames[i].name) {
            curResource.data.games[i] = topGames[i];
          } else {
            //If the index has changed, find the new index, if any, and upgrade
            var index = games.indexOf((obj) => {
              return obj.name == topGames[i].name;
            });
            if (index > -1) {
              //If the index is found, move it to the expected index
              curResource.data.games.splice(index, 1); //Remove the old entry
              curResource.data.games.splice(i, 0, topGames[i]); //Add in the updated entry at the expected point
            } else {
              //If it's just not in the DB at all (think new game), then splice it at the expected point
              curResource.data.games.splice(i, 0, topGames[i]);
            }
          }
        }
        //curResource.data = { games: topGames };
        curResource.markModified("data");
        curResource.collected = Date.now();
        curResource.save().then(function (curResource, topListSaveErr) {
          if (topListSaveErr) {
            console.log({ topListSaveErr });
          }
        });
      } else {
        var newResource = new Resource({
          name: "topGames",
          data: { games: topGames },
          collected: Date.now(),
        });
        newResource.save().then(function (curResource, err) {
          if (err) {
            conole.log("Error saving resource: ", err);
          }
        });
      }
      console.log("8/8: Loaded new BGG Data", Date.now() - loadTime);
    });
  } else {
    console.log(
      "8/8: Skipping BGG Data Collection, will collect again in " +
        msToTime(
          1000 * 60 * 60 * 24 * 7 - (Date.now() - curResource.collected)
        ),
      Date.now() - loadTime
    );
  }
});

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
    days = Math.floor(duration / (1000 * 60 * 60 * 24));

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  const getPlural = (num) => {
    if (num == 1) {
      return "";
    } else {
      return "s";
    }
  };
  return (
    days +
    " day" +
    getPlural(days) +
    ", " +
    hours +
    " hour" +
    getPlural(hours) +
    ", " +
    minutes +
    " minute" +
    getPlural(minutes) +
    ", and " +
    seconds +
    " second" +
    getPlural(seconds)
  );
}

function makeid(length = 5, checkList = []) {
  //TODO: Filter out bad words
  var result = "";
  var characters = "ABCEGHJKLMNPQRTUVWXYZ0123456789";
  var charactersLength = characters.length;
  var dup = true;
  do {
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    if (checkList) {
      dup = checkList.findIndex((obj) => obj == result) > -1;
    } else {
      dup = false;
    }
  } while (dup);
  return result;
}

console.log("5/8: Loading routes", Date.now() - loadTime);
//Set userNonce
router.get("/*", function (req, res, next) {
  if (typeof req.session.userNonce == "undefined") {
    req.session.userNonce = makeid(20);
  }
  console.log("UserNonce: ", req.session.userNonce);
  if (typeof req.session.currentURL != "undefined") {
    req.session.previousURL = req.session.currentURL;
  } else {
    req.session.previousURL = req.url;
  }
  req.session.currentURL = req.url;
  console.log(
    "Previous: ",
    req.session.previousURL,
    " | Current",
    req.session.currentURL
  );
  next();
});

router.get("*", function (req, res, next) {
  console.log("UserNonce for *: ", req.session.userNonce);
  next();
});

router.post("/user_nonce", function (req, res) {
  res.send({ userNonce: req.session.userNonce });
});

router.get("/privacy-tos", function (req, res, next) {
  res.render("privacy-tos");
  next();
});

router.get("/j/:session", (req, res) => {
  console.log("Join called*********************");
  console.log("Listcode: ", req.params.listCode);
  res.render("index", {
    sessionCode: req.params.session,
  });
});

router.get("/l/:listCode", (req, res) => {
  console.log("Listcode: ", req.params.listCode);
  res.render("index", {
    listCode: req.params.listCode,
  });
});

router.get(/^\/([A-Z0-9]{5})$/, (req, res) => {
  console.log("Listcode: ", req.originalUrl.substr(1));
  res.render("index", {
    sessionCode: req.originalUrl.substr(1),
  });
});
router.get(/^\/([A-Z0-9]{6})$/, (req, res) => {
  console.log("Listcode: ", req.originalUrl.substr(1));
  res.render("index", {
    listCode: req.originalUrl.substr(1),
  });
});

// Home page
router.get("/", (req, res) => {
  //console.log("query: ", req.query);
  //console.log("req.session: ", req.session);

  socketAPI.sendNotification("Reloading...");
  res.render("index", {
    sessionCode: "none",
  });
});

// Get notified when the user is navigating back
router.post("/going_back", function (req, res) {
  console.log(req.body, req.user);
  if (req.body.from == "#postSelectView" && req.body.to == "#selectView") {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      if (!curSession) {
        res.send(ERR_CODE);
      } else {
        var index = curSession.users.findIndex(
          (obj) => obj.user == req.user.id
        );
        curSession.users[index].done = false;
        console.log(req.user.id, curSession.owner);
        console.log("lock: ", curSession.lock);
        curSession.lock = "#selectView";
        curSession.save().then(function (err, status) {
          socketAPI.addGame({ code: req.body.code });
          res.send({ status: "User editing again" });
        });
      }
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
    res.send({ status: "Success" });
  } else {
    res.send(ERR_LOGIN);
  }
});

//Get current user's complete list object
router.post("/get_user_lists_populated", (req, res) => {
  console.log("gulp");
  if (req.user) {
    console.log("extUser: ", req.extUser);
    User.findOne({ profile_id: req.user.id })
      .populate("lists.allGames")
      .populate("lists.custom.games")
      .exec(function (err, curUser) {
        //console.log("GULP curUser:", curUser);
        management.users.get({ id: req.user.user_id }, function (err, extUser) {
          Session.find({}, "code").exec(function (err, codeList) {
            //console.log("auth0 user:", extUser);
            res.locals.user = req.user;
            if (extUser && extUser.username != "") {
              var displayName = extUser.username || req.user.displayName;
            } else {
              displayName = req.user.displayName;
            }
            //console.log("DisplayName: ", displayName);
            //console.log(extUser);
            if (curUser) {
              if (curUser.lists) {
                var modified = false;
                for (var i = 0; i < curUser.lists.custom.length; i++) {
                  if (
                    typeof curUser.lists.custom[i].listCode == "undefined" ||
                    curUser.lists.custom[i].listCode.length == 0
                  ) {
                    curUser.lists.custom[i].listCode = makeid(
                      6,
                      codeList.map((e) => e.code)
                    );
                    modified = true;
                    console.log(
                      "Made new id for list " +
                        curUser.lists.custom[i].name +
                        ": " +
                        curUser.lists.custom[i].listCode
                    );
                  }
                }
                if (modified) {
                  console.log("Saving curUser");
                  curUser.save();
                }
                getOwnedSessions(req.user.id, curUser.lists, res).then(
                  (result) => {
                    res.send(result);
                  }
                );
              } else {
                newUser = {
                  profile_id: req.user.id,
                  name: displayName,
                  lists: { allGames: [], custom: [] },
                  bgg: { username: "", collection: [] },
                };
                curUser = new User(newUser);
                curUser.save().then(bggUpdate(curUser));
                getOwnedSessions(req.user.id, curUser.lists, res).then(
                  (result) => {
                    res.send(result);
                  }
                );
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
              getOwnedSessions(req.user.id, curUser.lists, res).then(
                (result) => {
                  res.send(result);
                }
              );
            }
          });
        });
      });
  } else {
    res.send(ERR_LOGIN_SOFT);
  }
});

router.post("/get_sessions", (req, res) => {
  if (req.user) {
    getOwnedSessions(req.user.id, "", res).then((result) => {
      res.send(result);
    });
  } else {
    res.send({ err: "Log in first to view your sessions" });
  }
});

function getOwnedSessions(theId, lists, res) {
  var promise = new Promise(function (resolve, reject) {
    Session.find({ users: { $elemMatch: { user: theId } } }).exec(function (
      err,
      curSessions
    ) {
      var sessions = [];
      var curOwned = false;
      for (var i = 0; i < curSessions.length; i++) {
        curOwned = false;
        if (curSessions[i].owner == theId) {
          curOwned = true;
        }
        sessions.push({
          code: curSessions[i].code,
          games: curSessions[i].games.length,
          users: curSessions[i].users.length,
          phrase: curSessions[i].phrase,
          owned: curOwned,
        });
      }
      resolve({ lists: lists, sessions: sessions });
    });
  });
  return promise;
}

router.post("/rename_session", (req, res) => {
  if (req.user) {
    var code = req.body.code;
    var newName = req.body.newName;
    Session.findOne({ owner: req.user.id, code: code }).exec(function (
      err,
      curSession
    ) {
      if (!curSession) {
        res.send(ERR_CODE);
      } else {
        if (curSession && newName) {
          curSession.phrase = newName;
          curSession.save();
          res.send({ status: "Success" });
        } else {
          res.send({
            err: "Could not find session with that code owned by you",
          });
        }
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/delete_bulk_sessions", (req, res) => {
  var codes = req.body.sessions;
  Session.find({ code: { $in: codes } }).exec(function (err, theSessions) {
    if (!theSessions) {
      res.send(ERR_CODE);
    } else {
      console.log("The Sessions: ", theSessions);
      var toDelete = [];
      var toRemove = [];
      theSessions.forEach(function (e) {
        if (req.user.id == e.owner) {
          toDelete.push(e.code);
        } else {
          toRemove.push(e.code);
        }
      });
      console.log(toDelete);
      console.log(toRemove);
      var query = [];
      toDelete.forEach(function (e) {
        query.push({ deleteOne: { filter: { code: e, owner: req.user.id } } });
      });
      toRemove.forEach(function (e) {
        query.push({
          updateOne: {
            filter: {
              code: e,
              "users.user": req.user.id,
            },
            update: {
              $unset: {
                "users.$": "",
              },
            },
          },
        });
        query.push({
          updateOne: {
            filter: { users: null },
            update: {
              $pull: { users: null },
            },
          },
        });
      });
      console.log("Bulkwrite");
      console.log(JSON.stringify(query));
      Session.bulkWrite(query).then(function (result) {
        console.log(result);

        res.send({ result });
      });
    }
  });
});

router.post("/delete_session", (req, res) => {
  var code = req.body.code;
  Session.findOne({ code: req.body.code }).exec(function (err, theSession) {
    if (!theSession) {
      res.send(ERR_CODE);
    } else {
      if (req.user.id == theSession.owner) {
        Session.deleteOne({ owner: req.user.id, code: req.body.code }).exec(
          function (err, curSession) {
            res.send(curSession);
          }
        );
      } else {
        var index = theSession.users.findIndex(
          (obj) => obj.user.toString() == req.user.id.toString()
        );
        if (index > -1) {
          theSession.users.splice(index, 1);
          theSession.save();
          res.send(theSession);
        } else {
          res.send({ err: "Could not find user in session list" });
        }
      }
    }
  });
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
      var games = req.body.games;
      Game.find({ name: { $in: games } }).exec(function (err, curGames) {
        console.log("Bulk add Games: ", curGames);
        console.log(games);
        var toAdd = [];
        games.forEach(function (e, i) {
          var index = curGames.findIndex((obj) => obj.name == e);
          if (index == -1) {
            toAdd.push({ name: games[i], rating: 0, owned: 0 });
          }
        });
        if (toAdd.length > 0) {
          toAdd.forEach(function (e) {
            curGames.push(e);
          });
          console.log("CurGames: ", typeof curGames, ": ", curGames);
          Game.insertMany(toAdd).then(function () {
            //doesnt work becuase its a collection of objects, not an object
            Game.find({ name: { $in: games } }).exec(function (err, curGames) {
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

function bulkGameAdder(games, listIndexPlusOne, res, req) {
  games = games.map(function (e, i) {
    return mongoose.Types.ObjectId(e);
  });
  Game.find({ _id: { $in: games } }).exec(function (err, curGames) {
    //no Games to Add to Game table
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      curGames.forEach(function (e, i) {
        var index = curUser.lists.allGames.findIndex(
          (obj) => obj.toString() == curGames[i]._id.toString()
        );
        if (index == -1) {
          curUser.lists.allGames.push(mongoose.Types.ObjectId(curGames[i]._id));
        }
      });
      if (listIndexPlusOne > 0) {
        var list = listIndexPlusOne - 1;
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
      } else {
        res.send({ err: "Could not add list" });
      }
      curUser.save();
      console.log({ status: "Added bulk games: " + req.body.games });
      res.send({ status: "Added bulk games: " + req.body.games });
    });
  });
}

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
                  res.send({
                    err:
                      req.body.game.replace(/\\/, "") +
                      " has already been added",
                  });
                } else {
                  //if it's not, push it to the array and save the user
                  curUser.lists.allGames.push(game._id);
                  if (req.body.list) {
                    var index = curUser.lists.custom.findIndex(
                      (obj) => obj.name == req.body.list
                    );
                    console.log(index);
                    console.log(curUser.lists.custom[index].games);
                    curUser.lists.custom[index].games.push(game._id);
                  }
                  console.log("theGame: ", theGame);
                  curUser.save().then(function (theUser) {
                    Game.findById(
                      game._id,
                      "name",
                      function (err, gameToReport) {
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
                      }
                    );
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
            console.log(curSession);
            if (!curSession) {
              res.send(ERR_CODE);
            } else {
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
                curSession.games.push({
                  game: game._id,
                  addedBy: [req.user.id],
                });
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
                console.log(htmlString);
                res.send({ status: htmlString });
              }
            }
          });
        });
      }
    );
  } else {
    res.send(ERR_LOGIN);
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
      console.log("Error: ");
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
              //No one claims this game anymore
              curSession.games[i].addedBy = curSession.owner; //So make it so the owner claims it to avoid errors
              tosave = true; //And set it to be saved
            }
            //console.log(curSession.games[i], tosave);
          }
          var index = curSession.users.findIndex((obj) => {
            console.log(
              obj.user +
                " | guest" +
                req.session.userNonce +
                (obj.user == "guest" + req.session.userNonce)
            );
            return obj.user == "guest" + req.session.userNonce;
          });
          if (index > -1) {
            tosave = true;
            console.log(
              req.session.userNonce + " at " + index + ": deleting ",
              curSession.users[index]
            );
            delete curSession.users[index];
            console.log(curSession.users);
          } else {
            console.log(
              "Nothing in this list matched guest" + req.session.userNonce + ":"
            );
            console.log(curSession.users);
          }
          if (tosave) {
            curSession.save(); //Save the session if the flag has been set
          }
          socketAPI.addGame({
            code: curSession.code, //Passing this with only a code notifies others that a user has joined
          });
          res.send({
            owned: true, // because we checked that the owner is the current user
            status: {
              session: curSession,
              games: sendGames,
              user: req.user.id,
            },
          });
        } else {
          //Join as client
          console.log("Joining as client");
          var newUser = true; //Initialize to true, set to false if user is found
          if (lock == "#codeView") {
            lock = "#selectView";
          }
          var index = curSession.users.findIndex((obj) => {
            return obj.user == req.user.id;
          });
          if (index > -1) {
            newUser = false;
            if (curSession.users[index].done && lock == "#selectView") {
              lock = "#postSelectView";
            }
            if (curSession.users[index].doneVoting && lock == "#voteView") {
              lock = "#postVoteView";
            }
          }
          console.log("newUser ", newUser);
          if (newUser) {
            var displayName = "";
            management.users.get(
              { id: req.user.user_id },
              function (err, extUser) {
                console.log("auth0 user:", extUser);
                if (extUser) {
                  if (
                    extUser.user_metadata &&
                    extUser.user_metadata.userDefinedName &&
                    extUser.user_metadata.userDefinedName.length > 0
                  ) {
                    displayName = extUser.user_metadata.userDefinedName;
                  } else {
                    if (
                      extUser.username != "" &&
                      typeof extUser.username != "undefined"
                    ) {
                      displayName = extUser.username;
                    } else {
                      displayName = extUser.name;
                    }
                  }
                } else {
                  displayName = req.user.displayName;
                }
                curSession.users.push({
                  user: req.user.id,
                  name: displayName,
                  done: false,
                  doneVoting: false,
                });
                if (
                  curSession.users.findIndex(
                    (obj) => obj.user == "guest" + req.session.userNonce
                  ) > -1
                ) {
                  delete curSession.users[index];
                }
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
                      phrase: curSession.phrase,
                      limit: curSession.limit,
                    },
                  });
                });
              }
            );
          } else {
            if (
              curSession.users.findIndex(
                (obj) => obj.user == req.session.userNonce
              ) > -1
            ) {
              delete curSession.users[index];
              curSession.save();
            }
            socketAPI.addGame({
              code: theCode,
            });
            res.send({
              owned: false,
              status: {
                code: curSession.code,
                lock: lock,
                games: sendGames,
                phrase: curSession.phrase,
                limit: curSession.limit,
              },
            });
          }
        }
      } else {
        //Joining as guest. Add to users and voting array
        var newUser = true; //Initialize to true, set to false if user is found
        if (lock == "#codeView") {
          lock = "#selectView";
        }
        var index = curSession.users.findIndex((obj) => {
          //console.log(obj.user, "| guest" + req.session.userNonce);
          return obj.user == "guest" + req.session.userNonce;
        });
        //console.log(curSession.users);

        if (index > -1) {
          newUser = false;
          if (curSession.users[index].done && lock == "#selectView") {
            lock = "#postSelectView";
          }
          if (curSession.users[index].doneVoting && lock == "#voteView") {
            lock = "#postVoteView";
          }
        }
        if (newUser) {
          var guestNum = 0;
          for (var i = 0; i < curSession.users.length; i++) {
            var curUser = curSession.users[i].user;
            if (curUser.substr(0, 5) == "guest" && curUser.length == 25) {
              guestNum++;
            }
          }
          curSession.users.push({
            user: "guest" + req.session.userNonce,
            name: "Guest " + guestNum,
            done: true,
            doneVoting: false,
          });
        }
        curSession.save().then(function () {
          socketAPI.addGame({
            code: theCode,
          });
          res.send({
            owned: false,
            status: {
              code: curSession.code,
              lock: lock,
              games: [],
              phrase: curSession.phrase,
            },
          });
        }); /*
        //Joining as guest. Not added to users or voting array
        res.send({
          owned: false,
          status: {
            code: curSession.code,
            lock: lock,
            games: [],
            phrase: curSession.phrase,
          },
        });*/
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
  if (req.user) {
    Session.find({}, "code").exec(function (err, codeList) {
      //`console.log(codeList);
      var dup = true;
      var theCode = "";
      theCode = makeid(
        5,
        codeList.map((e) => e.code)
      ); // Make a new code for the session
      var displayName = "";
      management.users.get({ id: req.user.user_id }, function (err, extUser) {
        // Get the user info from Auth0
        //console.log("auth0 user:", extUser);
        res.locals.user = req.user; //Set correct displayName and user var for locals
        if (extUser) {
          if (
            extUser.user_metadata &&
            extUser.user_metadata.userDefinedName &&
            extUser.user_metadata.userDefinedName.length > 0
          ) {
            displayName = extUser.user_metadata.userDefinedName;
          } else {
            if (
              extUser.username != "" &&
              typeof extUser.username != "undefined"
            ) {
              displayName = extUser.username;
            } else {
              displayName = extUser.name;
            }
          }
        } else {
          displayName = req.user.displayName;
        }
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, "0");
        var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
        var yyyy = today.getFullYear();
        var readableGen = new Readable(true, 2, "_");
        today = mm + "." + dd + "." + yyyy + " " + readableGen.generate();
        var sessiondetail = {
          owner: req.user.id,
          phrase: today,
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
        var session = new Session(sessiondetail); //Make a new session with the new code
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
      if (!curSession) {
        res.send(ERR_CODE);
      } else {
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
              if (
                curSession.games[j].game.toString() == req.body.gamesToAdd[i]
              ) {
                gameAdded = true;
                index = j;
                if (curSession.games[j].addedBy.includes(req.user.id)) {
                  ownedBy = true;
                  //console.log(numGames);
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
                //console.log(numGames);
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
              socketAPI.sendNotification(
                "A user added a new game..." + numGames
              );
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
              res.send({ status: "completed" });
            });
          } else {
            res.send({ err: "Nothing to add" });
          }
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
      if (!curSession) {
        res.send(ERR_CODE);
      } else {
        var index = curSession.users.findIndex(
          (obj) => obj.user == req.user.id
        );
        curSession.users[index].done = true;
        curSession.lock = "#selectView";
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
      if (!curSession) {
        res.send(ERR_CODE);
      } else {
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
              (obj) =>
                obj.game.toString() == curSession.games[i].game.toString()
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
            curSession.votes[i].active
              ? (checked = " checked")
              : (checked = "");
            curSession.votes[i].active ? (green = " greenText") : (green = "");
            htmlString +=
              `<li` +
              dupeSearch(fuse, curSession.votes[i]) +
              `><div class="editGame` +
              green +
              `">` +
              curSession.votes[i].name.replace(/\\/, "") +
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
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }

  function dupeSearch(fuse, vote) {
    vote.dup = "";
    var searchres = fuse.search(vote.name);
    console.log(vote.name, Object.keys(searchres).length, searchres);
    for (let key in searchres) {
      if (searchres[key].score > 0.4) {
        delete searchres[key];
      }
    }
    if (Object.keys(searchres).length > 1) {
      return ' class="dup"';
    } else {
      var the = vote.name.substr(0, 4).toLowerCase();
      var an = vote.name.substr(0, 3).toLowerCase();
      var a = vote.name.substr(0, 2).toLowerCase();
      console.log(vote.name, the, an, a);
      var len = 0;
      if (the == "the ") {
        len = 4;
      }
      if (an == "an ") {
        len = 3;
      }
      if ((a = "a ")) {
        len = 2;
      }
      if (len > 0) {
        var searchres = fuse.search(vote.name.substr(len));
        console.log(vote.name, Object.keys(searchres).length, searchres);
        for (let key in searchres) {
          if (searchres[key].score > 0.4) {
            delete searchres[key];
          }
        }
        if (Object.keys(searchres).length > 1) {
          return ' class="dup"';
        } else {
          return "";
        }
      } else {
        return "";
      }
    }
  }
});

//Hey wait, what does this modify? The owner's game list or the session game list? And when?
router.post("/modify_edit_list", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      if (!curSession) {
        res.send(ERR_CODE);
      } else {
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
                    "Couldn't find game to remove: " +
                    req.body.gamesToRemove[i],
                });
              }
            }
          } else {
            res.send({ err: "No games to add or remove passed" });
          }
        }
        curSession.save().then(function (error, result, numRows) {
          //console.log("Error: ", error);
          var gameList = [];
          var activeList = [];
          var ret = [];
          for (var i = 0; i < curSession.games.length; i++) {
            gameList.push(mongoose.Types.ObjectId(curSession.games[i].game));
            activeList.push(curSession.votes[i].active);
          }
          //console.log(activeList)
          Game.find({ _id: { $in: gameList } }).exec(function (err, games) {
            for (var i = 0; i < games.length; i++) {
              ret[i] = {
                name: games[i].name,
                id: games[i]._id,
                active: activeList[i],
              };
            }
            res.send({ status: ret });
          });
        });
      }
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
    saveVoteStats(req.body.voteArray);
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

function saveVoteStats(voteArray) {
  console.log(voteArray);
  var gamesList = [];
  voteArray.forEach(function (e) {
    gamesList.push(e.game);
  });
  var day = new Date();
  day = "" + day.getFullYear() + (day.getMonth() + 1) + day.getDate();
  Stat.findOneAndUpdate(
    { day: day },
    { day: day },
    { new: true, upsert: true }
  ).exec(function (err, curStat) {
    console.log(curStat);
    voteArray.forEach(function (e) {
      if (typeof curStat.games != "undefined") {
        console.log("curStat: ", curStat.games);
        console.log("e.game: ", e.game);
        console.log("length: " + curStat.games.length);
        var index = curStat.games.findIndex((obj) => {
          return obj.game.toString() == e.game;
        });
      } else {
        var index = -1;
      }
      console.log("index: " + index);
      if (index == -1) {
        curStat.games.push({
          game: mongoose.Types.ObjectId(e.game),
          votes: [
            {
              vote: Number(e.vote),
              timestamp: Date.now(),
            },
          ],
        });
        console.log(curStat.games[curStat.games.length - 1]);
      } else {
        curStat.games[index].votes.push({
          vote: Number(e.vote),
          timestamp: Date.now(),
        });
        console.log(curStat.games[index]);
      }
    });
    curStat.save();
  });
}

router.post("/save_votes", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      if (!curSession) {
        res.send(ERR_CODE);
      } else {
        var index = curSession.users.findIndex((obj) => {
          return obj.user.toString() == req.user.id.toString();
        });
        if (index > -1) {
          if (req.body.incrementer < curSession.users[index].voteIncrementer) {
            res.send({ err: "Received save event out of order" });
          } else {
            curSession.users[index].votes = req.body.votes;
            curSession.users[index].voteIncrementer = req.body.incrementer;
            console.log(req.body.incrementer);
            curSession.save();
            console.log(curSession);
            res.send({ status: "Success" });
          }
        } else {
          res.send({ err: "No user found" });
        }
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});
router.post("/get_votes", function (req, res) {
  //if (req.user) {
  var games = [];
  console.log(req.body);
  Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
    if (!curSession) {
      res.send(ERR_CODE);
    } else {
      for (var i = 0; i < curSession.votes.length; i++) {
        if (curSession.votes[i].active) {
          games.push({
            game: curSession.votes[i].game,
            name: curSession.votes[i].name,
          });
        }
      }
      res.send({ games: games });
    }
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
      if (!curSession) {
        res.send(ERR_CODE);
      } else {
        var games = [];
        for (var i = 0; i < curSession.votes.length; i++) {
          if (curSession.votes[i].active == true) {
            games.push({ name: curSession.votes[i].name, votes: 0 });
            for (var j = 0; j < curSession.votes[i].voters.length; j++) {
              if (curSession.votes[i].voters[j].vote < 5) {
                games[games.length - 1].votes -= 500;
                if (games[games.length - 1].votes < 0) {
                  games[games.length - 1].votes = 0;
                }
              } else {
                games[games.length - 1].votes +=
                  curSession.votes[i].voters[j].vote;
              }
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
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/get_games", function (req, res) {
  //if (req.user) {
  Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
    if (!curSession) {
      res.send(ERR_CODE);
    } else {
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
    }
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
        if (req.body.games) {
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
        } else {
          res.send({ err: "Error: No Games Copied" });
        }
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
      if (typeof req.body.list != "undefined") {
        var listNum = Number(req.body.list) - 1;
        if (listNum == -1) {
          res.send({ err: "Can't rename All Games" });
        } else {
          User.findOne({ profile_id: req.user.id }).exec(function (
            err,
            curUser
          ) {
            if (curUser.lists.custom[listNum]) {
              curUser.lists.custom[listNum].name = req.body.newName;
              curUser.save();
              res.send({ status: "Success" });
            } else {
              res.send({ err: "Error: List not found" });
            }
          });
        }
      } else {
        res.send({ err: "Error: No list sent" });
      }
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
        curUser.lists.custom.splice(listNum, 1);
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

function getListCodes() {
  var promise = new Promise(function (resolve, reject) {
    User.aggregate([
      {
        $project: {
          listCodes: {
            $map: {
              input: "$lists.custom",
              as: "list",
              in: { listCode: "$$list.listCode" },
            },
          },
        },
      },
    ]).exec(function (err, listCodes) {
      if (err) {
        reject({ err: "Error" });
      }
      var listCodeArray = [];
      listCodes.forEach((e) => {
        if (Array.isArray(e)) {
          e.forEach((el) => listCodeArray.push(el.listCode));
        }
      });
      resolve(listCodeArray);
    });
  });
  return promise;
}

router.post("/list_add", function (req, res) {
  if (req.user) {
    if (req.body.list) {
      User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
        getListCodes().then(function (listCodeArray) {
          var index = curUser.lists.custom.findIndex(
            (obj) => obj.name == req.body.list
          );
          if (index == -1) {
            var listCode = makeid(6, listCodeArray);
            curUser.lists.custom.push({
              name: req.body.list,
              games: [],
              listCode: listCode,
            });
            curUser.save();
            res.send({ status: "Success", listCode: listCode });
          } else {
            res.send({ err: "Already added a list with this name" });
          }
        });
      });
    } else {
      res.send({ err: "Cannot add empty list" });
    }
  }
});

function listAdder(list, id, overwrite) {
  var promise = new Promise(function (resolve, reject) {
    User.findOne({ profile_id: id }).exec(function (err, curUser) {
      var index = curUser.lists.custom.findIndex((obj) => obj.name == list);
      if (index == -1) {
        curUser.lists.custom.push({ name: list, games: [] });
        curUser.save();
        resolve({ status: "Success", len: curUser.lists.custom.length });
      } else {
        if (overwrite) {
          curUser.lists.custom[index] = { name: list, games: [] };
          resolve({ status: "Success", len: index + 1 });
        } else {
          console.log("Already added");
          resolve({ err: "Already added a list with this name" });
        }
      }
    });
  });

  return promise;
}

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
      res.send({ games: curResource.data.games });
    }
  });
});
//Takes a game's name and returns an object with the game or an error
router.post("/bga_find_game", function (req, res) {
  console.log("Finding " + req.body.game.replace(/[^0-9a-zA-Z ]/g, ""));
  Resource.findOne({ name: "topGames" }).exec(function (err, curResource) {
    var a = 0;
    var index = curResource.data.games.findIndex((obj) => {
      if (a == 0) {
        console.log(obj.name);
        console.log(req.body.game);
        a++;
      }
      if (obj.name.substr(0, 4) == req.body.game.substr(0, 4)) {
        console.log("|" + obj.name + "|" + req.body.game + "|");
      }
      return obj.name == req.body.game;
    });
    if (index == -1) {
      var index = curResource.data.games.findIndex((obj) => {
        return (obj.actualName = req.body.game);
      });
    }
    if (index > -1) {
      console.log("found exact match");
      res.send(curResource.data.games[index]);
    } else {
      console.log(
        "Didn't find exact match for " +
          req.body.game +
          " in " +
          curResource.data.games.length +
          " records, now looking for " +
          req.body.game.replace(/[^0-9a-zA-Z' ]/g, "")
      );
      bgaRequest({
        name: req.body.game.replace(/[^0-9a-zA-Z' ]/g, ""),
        /*fuzzy_match: true,*/
        limit: 1,
      }).then((ret) => {
        if (ret.error) {
          res.send({ err: ret.error.message });
        }
        var url =
          `https://www.boardgamegeek.com/geeksearch.php?action=search&q=` +
          req.body.game +
          `&objecttype=boardgame`;
        var userGame = {
          name: req.body.game,
          url: url,
          error: true,
        };
        curResource.data.games.push(userGame);
        curResource.markModified("data");
        //If the search returned no games, return a generic search for boardgamegeek
        if (ret.games.length == 0) {
          curResource.save();
          res.send(userGame);
        } else {
          //If the search returned anything, check if it matched exactly
          var index = curResource.data.games.indexOf((obj) => {
            return obj.name == ret.games[0].name;
          });
          if (index > -1) {
            //If there's an exact match in the database, put the newly gathered information there
            curResource.data.games[index] = ret.games[0];
          } else {
            //If there isn't an exact match, add the inexact match to the database
            curResource.data.games.push(ret.games[0]);
            //And add an entry with the user submitted search to the database
            var newEntry = ret.games[0];
            var actualName = newEntry.name;
            var usersname = req.body.game;
            console.log(ret.games[0].name, req.body.game);
            newEntry.actualName = actualName;
            newEntry.name = usersname;
            console.log({ actualName });
            console.log(newEntry.actualName);
            console.log({ usersname });
            console.log(newEntry.name);
            curResource.data.games.push(newEntry);
          }
          curResource.markModified("data");
          curResource.save((err, result) => {
            res.send(ret.games[0]);
          });
        }
      });
    }
  });
});

router.post("/bga_find_id", function (req, res) {
  bgaRequest({ id: req.body.id, fuzzy_match: true, limit: 1 }).then((ret) => {
    if (ret.games.length == 0) {
      res.send({ err: req.body.game + " not found" });
    } else {
      res.send(ret.games[0]);
    }
  });
});

function bgaRequest(options) {
  var promise = new Promise((resolve, reject) => {
    var optString = "";
    for (let option in options) {
      optString += "&" + option + "=" + options[option];
    }
    optString =
      "https://api.boardgameatlas.com/api/search?client_id=" +
      process.env.BGAID +
      optString;
    console.log("optString: " + optString);
    https.get(optString, (resp) => {
      var data = "";

      // A chunk of data has been recieved.
      resp.on("data", (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on("end", () => {
        //console.log(JSON.parse(data));
        resolve(JSON.parse(data));
      });
    });
  });
  return promise;
}

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
          res.send({ notice: "No BGG User" });
        } else {
          res.send({ success: curUser.bgg.collection });
        }
      } else {
        res.send({ err: "No user" });
      }
    });
  } else {
    res.send(ERR_LOGIN_SOFT);
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

function getListCodeInfo(code) {
  var promise = new Promise(function (resolve, reject) {
    User.findOne({
      "lists.custom": { $elemMatch: { listCode: code } },
    }).exec(function (err, curUser) {
      if (curUser) {
        var index = curUser.lists.custom.findIndex(
          (obj) => obj.listCode == code
        );
        console.log(index);
        if (index > -1) {
          resolve(curUser.lists.custom[index]);
        } else {
          resolve({ err: "No such list found in matched user" });
        }
      } else {
        resolve({ err: "Could not find anyone with this list" });
      }
    });
  });
  return promise;
}

router.post("/get_list_code_info", function (req, res) {
  if (req.user) {
    getListCodeInfo(req.body.code).then(function (theList) {
      console.log(req.user.id);
      User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
        console.log(curUser);
        var overwrite =
          curUser.lists.custom.findIndex((obj) => {
            console.log(obj.name);
            return obj.name == theList.name;
          }) > -1;
        console.log(overwrite);
        res.send({ list: theList, overwrite: overwrite });
      });
    });
  } else {
    res.send({
      err:
        "Welcome to SelectAGame!<br/></br> This link leads to a list of games; if you'd like to save it to your profile, click the button below to login or sign up!",
    });
  }
});

router.post("/get_list_from_code", function (req, res) {
  if (req.user) {
    getListCodeInfo(req.body.code).then(function (theList) {
      if (theList.err) {
        res.send(theList);
      } else {
        var name = req.body.name || theList.name;
        listAdder(name, req.user.id, false).then((list) => {
          console.log("ListAdder Returned");
          if (typeof theList.games != "undefined" && list.len) {
            console.log(theList.games);
            bulkGameAdder(theList.games, list.len, res, req);
          } else {
            res.send(list);
          }
        });
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/import_session_as_list", function (req, res) {
  console.log("adding session");
  if (req.user) {
    getSessionInfo(req.body.code).then(function (theSession) {
      if (!theSession.err) {
        var theList = theSession.games; //array of game ObjectIds
        console.log(typeof req.body.name);
        if (typeof req.body.name == "undefined") {
          var name = theSession.name; //Session phrase
        } else {
          var name = req.body.name;
        }
        listAdder(name, req.user.id, req.body.overwrite).then((list) => {
          //create the list
          if (typeof theList != "undefined" && list.len) {
            //check to see everything returned OK
            console.log(theList, list.len);
            console.log("BulkGamesAdder:", list.len);
            bulkGameAdder(theList, list.len, res, req); //then add all of the games that belong in the list and send result
          } else {
            //if an error happened
            res.send(list); //send the error message returned by listAdder
          }
        });
      } else {
        res.send(theSession.err);
      }
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

function getSessionInfo(code) {
  var promise = new Promise(function (resolve, reject) {
    Session.findOne({ code: code }).exec(function (err, curSession) {
      if (err) {
        resolve({ err: err });
      } else {
        if (curSession == null) {
          resolve({ err: "No such session" });
        } else {
          var ret = { name: curSession.phrase };
          ret.games = curSession.games.map((e) => {
            return e.game;
          });
          console.log(ret);
          resolve(ret);
        }
      }
    });
  });
  return promise;
}

router.post("/find_session_list", function (req, res) {
  if (req.user) {
    console.log("Req: ", req.body);
    User.findOne({
      $and: [
        {
          "lists.custom": { $elemMatch: { name: req.body.list } },
        },
        { profile_id: req.user.id },
      ],
    }).exec(function (err, curSession) {
      //console.log(curSession);
      console.log({ exists: curSession != null });
      res.send({ exists: curSession != null, result: curSession });
    });
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/set_session_limit", function (req, res) {
  console.log(Number(req.body.limit));
  console.log(req.body.limit);
  if (req.user) {
    if (typeof req.body.limit != "undefined") {
      if (req.body.limit > -1) {
        if (!isNaN(req.body.limit)) {
          Session.updateOne(
            { code: req.body.code },
            { limit: Number(req.body.limit) }
          ).exec(function (err, curSession) {
            if (!err) {
              res.send({ limit: Number(req.body.limit) });
              socketAPI.setLimit({
                limit: req.body.limit,
                code: req.body.code,
              });
            } else {
              res.send(err);
            }
          });
        } else {
          res.send({ err: "Limit must be a number" });
        }
      } else {
        res.send({ err: "Can't set a limit below 0" });
      }
    } else {
      res.send({ err: "No limit set" });
    }
  } else {
    res.send(ERR_LOGIN);
  }
});

router.post("/get_session_limit", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      if (typeof curSession != "undefined" && curSession != null) {
        if (typeof curSession.limit == "undefined") {
          console.log(curSession.limit);
          console.log(typeof curSession.limit);
          console.log(curSession);
          Session.updateOne({ code: req.body.code }, { limit: 0 }).exec(
            function (err, curSession) {
              if (!err) {
                res.send({ limit: 0 });
              } else {
                res.send(err);
              }
            }
          );
        } else {
          res.send({ limit: Number(curSession.limit) });
        }
      } else {
        res.send({ status: "no session" });
      }
    });
  } else {
    res.send({ status: "no user" });
  }
});

router.post("/get_list_browser", function (req, res) {
  if (req.user) {
    var authorized = true; //Testing
    if (authorized) {
      var htmlString = "";
      var ret = [];
      var gameIds = [];
      User.findOne({ name: "listmaster" }).exec(function (err, curUser) {
        var lists = curUser.lists.custom;
        var toPush = {};
        lists.forEach(function (e) {
          toPush = { name: e.name, code: e.listCode, games: [] };

          e.games.forEach(function (game) {
            gameIds.push(game);
            toPush.games.push(game);
          });
          ret.push(toPush);
        });
        Game.find({ _id: { $in: gameIds } }).exec(function (err, curGames) {
          var gameKey = [];
          curGames.forEach(function (e) {
            gameKey.push({ id: e._id, name: e.name });
          });
          res.send({ lists: ret, gameKey: gameKey });
        });
      });
    } else {
      res.send({ error: "unauthorized" });
    }
  } else {
    res.send({ status: "no user" });
  }
});

console.log("6/8: Routes loaded", Date.now() - loadTime);

module.exports = router;
