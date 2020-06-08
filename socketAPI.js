require("dotenv").config();
var socket_io = require("socket.io");
var io = socket_io();
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
var User = require("./models/users.js");
var Game = require("./models/games.js");
var Session = require("./models/sessions.js");

var socketAPI = {};
var numGames = [];
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

function getSessionGames(curSession) {
  var curUsers = {};
  console.log(curSession);
  for (var i = 0; i < curSession.games.length; i++) {
    for (var j = 0; j < curSession.games[i].addedBy.length; j++) {
      if (typeof curUsers[curSession.games.addedBy[j]] == "undefined") {
        curUsers[curSession.games.addedBy[j]].num = 0;
        var index = curSession.users.findIndex((obj) => {
          obj.user == curSession.games.addedBy[j];
        });
        curUsers[curSession.games.addedBy[j]].done =
          curSession.users[index].done;
      } else {
        curUsers[curSession.games.addedBy[j]]++;
      }
    }
  }
  console.log("curUsers: ", curUsers);
  return curUsers;
}

socketAPI.addGame = function (data) {
  //This function really just needs to output:
  //  1) Each connected user's name
  //  2) The associated number of added games
  //  3) The associated done status

  //data.code(required);

  //1. Get Session using data.code
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    //2. Get list of curSession.users.user(s) and make a numGames array
    if (curSession) {
      for (var i = 0; i < curSession.users.length; i++) {
        numGames[i] = {
          id: curSession.users[i].user,
          name: "",
          num: 0,
          done: curSession.users[i].done,
        };
      }
      //a. Note that this requires "done" to be set by public.js when user clicks through
      //3. Look up names for numGames.user.name
      var profiles = curSession.users.map(function (val, i) {
        return val.user;
      });
      User.find({ profile_id: { $in: profiles } }).exec(function (
        err,
        usernames
      ) {
        console.log("profiles: ", profiles);
        console.log("usernames: ", usernames);
        for (var j = 0; j < numGames.length; j++) {
          var index = usernames.findIndex(
            (obj) => obj.profile_id == numGames[j].id
          );
          console.log("j:" + j);
          console.log("index:" + index);
          numGames[j].name = usernames[index].name;
        }

        //4. Look through curSession.games
        //a. if empty, do nothing since num=0 by default
        if (curSession.games.length > 0) {
          for (var k = 0; k < curSession.games.length; k++) {
            for (var l = 0; l < curSession.games[k].addedBy.length; l++) {
              var index = numGames.findIndex(
                (obj) => obj.id == curSession.games[k].addedBy[l]
              );

              //b. if not empty, add one to each numGames.user.num for each curSession.games.addedBy that matches
              numGames[index].num++;
            }
          }
        }
        //Now we have numGames with id, name, done, and num filled for each user
        //5. Remove id from each user
        for (var i = 0; i < numGames.length; i++) {
          numGames[i].id = "";
        }
        //6. Emit to owner
        io.sockets.emit(data.code + "select", numGames);
      });
    }
  });
};

// @param users
//    Array of user profile ids for current session from mongoose
// @param usernames
//    Object containing all user objects in current session
//    From command User.find({profile_id: {$in: users}}, function(err, usernames){...});
function createUserMap(users, usernames) {
  var userMap = {};
  for (var i = 0; i < users.length; i++) {
    //console.log("user: ", users[i]);
    userMap[users[i].user] = usernames[i].name;
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
      var profiles = users.map(function (val, i) {
        return val.user;
      });
      console.log("profiles: ", profiles);
      User.find({ profile_id: { $in: profiles } }).exec(function (
        err,
        usernames
      ) {
        console.log("usernames: ", usernames);
        userMap = createUserMap(users, usernames);
        console.log("usermap: ", userMap);
        for (var i = 0; i < curSession.users.length; i++) {
          if (typeof numGames[curSession.users[i].user] == "undefined") {
            numGames[curSession.users[i].user] = { num: 0, done: false };
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

socketAPI.lockGames = function (data) {
  var ret = {};
  console.log("locking, ", data.code);
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    curSession.lock = "postPostSelectView";
    ret.lockBack = true;
    ret.lock = "#postSelectView";
    console.log("seinding " + data.code + "client with data", ret);
    io.sockets.emit(data.code + "client", ret);
    curSession.save();
  });
};

socketAPI.unlockGames = function (data) {
  console.log("unlock: ", data);
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    var ret = {};
    curSession.lock = "postSelectView";
    ret.unlockBack = true;
    ret.unlock = "selectView";
    for (var i = 0; i < curSession.games.length; i++) {
      if ((curSession.games[i].addedBy = [])) {
        curSession.games[i].addedBy = [data.user];
      }
    }
    console.log("saving...", ret);
    curSession.save(function () {
      console.log("saved! Emitting " + data.code + "client", ret);
      io.sockets.emit(data.code + "client", ret);
      console.log("emitted");
    });
  });
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
