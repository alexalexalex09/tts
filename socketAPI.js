require("dotenv").config();
var socket_io = require("socket.io");
var io = socket_io();
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
var User = require("./models/users.js");
var Game = require("./models/games.js");
var Session = require("./models/sessions.js");

var socketAPI = {};
var numGames = {};
var code = "";
socketAPI.io = io;

socketAPI.sendNotification = function (data) {
  io.sockets.emit("hello", { msg: data });
};

//Receive the add game event from toggling the switch, including the number
//of that user's added games from MongoDB.
//NB: When data comes without data.user or data.numGames, the numGames object
//is returned unmodified to initialize the object for the client.
// @param data
//      data.code (req) - current session code
//      data.user (opt) - user that is currently adding a game
//      data.numGames (opt) - number of Games current user currently has added

socketAPI.addGame = function (data) {
  console.log("addGame", data, numGames);
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    if (curSession) {
      var users = curSession.users;
      User.find({ profile_id: { $in: users } }).exec(function (err, usernames) {
        userMap = createUserMap(users, usernames);
        if (
          typeof data.user != "undefined" &&
          typeof data.done != "undefined"
        ) {
          numGames[data.user].done = data.done;
          console.log("Is done? ", numGames[data.user]);
        } else {
          if (
            typeof data.user != "undefined" &&
            typeof data.numGames != "undefined"
          ) {
            //TODO: Change this so data.user is the userID, not name, because name isn't guaranteed unique!
            if (typeof numGames[data.user] == "undefined") {
              numGames[data.user] = { num: 0, done: false };
            }
            numGames[data.user].num = data.numGames;
            numGames[data.user].done = false;
          }
        }
        console.log("usermap: ", userMap, "numGames, ", numGames);
        io.sockets.emit(
          data.code + "select",
          replaceUserIds(userMap, numGames)
        );
      });
    }
  });
};

//@param userMap: object created by userMap()
//@param idObj: object containing userId *keys* to be replaced with names from userMap
function replaceUserIds(userMap, idObj) {
  var ret = {};
  console.log(idObj);
  Object.keys(idObj).map(function (k, i) {
    console.log(k, "|userMap:", userMap);
    ret[userMap[k]] = idObj[k];
  });
  console.log("ret: ", ret);
  return ret;
}

// @param users
//    Array of user profile ids for current session from mongoose
// @param usernames
//    Object containing all user objects in current session
//    From command User.find({profile_id: {$in: users}}, function(err, usernames){...});
function createUserMap(users, usernames) {
  var userMap = {};
  for (var i = 0; i < users.length; i++) {
    //console.log("user: ", users[i]);
    userMap[users[i]] = usernames[i].name;
  }
  return userMap;
}

socketAPI.initGames = function (data) {
  //console.log("initGames", data);
  var userMap = {};
  numGames = {};
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    if (curSession) {
      var users = curSession.users;
      console.log("users: ", users);
      User.find({ profile_id: { $in: users } }).exec(function (err, usernames) {
        console.log("usernames: ", usernames);
        userMap = createUserMap(users, usernames);
        console.log("usermap: ", userMap);
        for (var i = 0; i < curSession.users.length; i++) {
          if (typeof numGames[curSession.users[i]] == "undefined") {
            numGames[curSession.users[i]] = { num: 0, done: false };
          }
        }
        for (var i = 0; i < curSession.games.length; i++) {
          for (var j = 0; j < curSession.games[i].addedBy.length; j++) {
            var owner = curSession.games[i].addedBy[j];
            //console.log("owner: ", owner);
            numGames[owner].done = false;
            if (numGames[owner]) {
              numGames[owner].num++;
              console.log(owner, ", ", numGames[owner]);
            } else {
              numGames[owner].num = 1;
            }
          }
        }
        console.log("numGames, ", numGames);
        //eventually switch numGames to track ids, and return a different array, userGames, with names replaced
        socketAPI.addGame({ code: data.code });
      });
    }
  });
};

socketAPI.gamesSubmitted = function (data) {
  numGames[data.user].done = true;
  io.sockets.emit(data.code + "gamesSubmit", data);
};

io.on("connection", function (socket) {
  socket.on("addGame", (data) => {
    console.log("addgame was called");
    socketAPI.addGame(data);
  });
  console.log("A user connected");
});

module.exports = socketAPI;

/*This needs to:
    1) Hear from the client which session the user is currently owning (if any)
    2) If a session is owned, notice when the Session document for that user's owned session is changed
    3) Emit an event to the client with
        1) Each connected user
        2) Each user's number of added games
*/
