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
  if (data.user && data.numGames) {
    numGames[data.user] = data.numGames;
    io.sockets.emit(data.code, numGames);
  } else {
    io.sockets.emit(data.code, numGames);
  }
};

socketAPI.initGames = function (data) {
  //console.log("initGames", data);
  var userMap = {};
  User.find({}, function (err, users) {
    Session.findOne({ code: data.code }).exec(function (err, curSession) {
      if (curSession) {
        //console.log(curSession);
        for (var i = 0; i < users.length; i++) {
          //console.log("user: ", users[i]);
          userMap[users[i].profile_id] = users[i].name;
        }
        //console.log("usermap: ", userMap);
        for (var i = 0; i < curSession.users.length; i++) {
          numGames[userMap[curSession.users[i]]] = 0;
        }
        for (var i = 0; i < curSession.games.length; i++) {
          for (var j = 0; j < curSession.games[i].addedBy.length; j++) {
            var owner = curSession.games[i].addedBy[j];
            //console.log("owner: ", owner);
            if (numGames[userMap[owner]]) {
              numGames[userMap[owner]]++;
              console.log(owner, ", ", numGames[userMap[owner]]);
            } else {
              numGames[userMap[owner]] = 1;
            }
          }
        }
      }
      //console.log("numGames, ", numGames);
      socketAPI.addGame({ code: data.code });
    });
  });
};

socketAPI.removeGame = function (data) {
  data.user;
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
