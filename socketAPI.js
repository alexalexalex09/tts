require("dotenv").config();
var socket_io = require("socket.io");
var io = socket_io();
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
var User = require("./models/users.js");
var Game = require("./models/games.js");
var Session = require("./models/sessions.js");

var socketAPI = {};
socketAPI.io = io;

socketAPI.sendNotification = function (data) {
  io.sockets.emit("hello", { msg: data });
};

socketAPI.addGame = function (data) {
  //Take these two pieces of data (arrays) into account if available and
  //then get all remaining game names to output the current list

  //This function really just needs to output:
  //  1) Each connected user's name
  //  2) The associated number of added games
  //  3) The associated done status

  //data.code(required);

  //1. Get Session using data.code
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    //2. Get list of curSession.users.user(s) and make a numGames array
    if (curSession) {
      var numGames = getSessionArray(curSession);
      var profiles = curSession.users.map(function (val, i) {
        return val.user;
      });
      getNames(profiles, numGames, curSession, data).then((res) => {
        io.sockets.emit(data.code + "owner", res);
        io.sockets.emit(data.code + "client", res);
      });
    }
  });
};

function getSessionArray(curSession) {
  var numGames = [];
  if (curSession) {
    for (var i = 0; i < curSession.users.length; i++) {
      numGames[i] = {
        id: curSession.users[i].user,
        name: curSession.users[i].name,
        num: 0,
        done: curSession.users[i].done,
      };
    }
    //a. Note that this requires "done" to be set by public.js when user clicks through
    //3. Look up names for numGames.user.name
    return numGames;
  } else {
    return { error: "No session" };
  }
}

function getNames(profiles, numGames, curSession, data) {
  return new Promise((resolve, reject) => {
    var theError = "";
    if (typeof numGames == "undefined") {
      reject("Err: numgames ", numGames);
    } else {
      if (theError == "") {
        //4. Look through curSession.games
        //a. if empty, do nothing since num=0 by default
        if (curSession.games.length > 0) {
          for (var k = 0; k < curSession.games.length; k++) {
            for (var l = 0; l < curSession.games[k].addedBy.length; l++) {
              var index = numGames.findIndex(
                (obj) => obj.id == curSession.games[k].addedBy[l]
              );

              //b. if not empty, add one to each numGames.user.num for each curSession.games.addedBy that matches
              if (index > -1) {
                numGames[index].num++;
              }
            }
          }
        }
        //Now we have numGames with id, name, done, and num filled for each user
        //5. Remove id from each user
        for (var i = 0; i < numGames.length; i++) {
          numGames[i].id = "";
        }
        //6. Emit to owner and client
        var gamesList = [];
        var namesList = [];
        curSession.games.forEach(function (e) {
          gamesList.push(mongoose.Types.ObjectId(e.game));
        });
        Game.find({ _id: { $in: gamesList } }).exec(function (err, games) {
          games.forEach(function (e) {
            namesList.push(e.name);
          });
          resolve({
            selectEvent: true,
            select: numGames,
            curGames: namesList,
          });
        });
      } else {
        reject({ err: theError });
      }
    }
  });
}

// @param users
//    Array of user profile ids for current session from mongoose
// @param usernames
//    Object containing all user objects in current session
//    From command User.find({profile_id: {$in: users}}, function(err, usernames){...});
/*function createUserMap(users, usernames) {
  var userMap = {};
  for (var i = 0; i < users.length; i++) {
    //console.log("user: ", users[i]);
    userMap[users[i].user] = usernames[i].name;
  }
  return userMap;
}*/

/*socketAPI.initGames = function (data) {
  //console.log("initGames", data);
  var numGames = {};
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    if (curSession) {
      var users = curSession.users;
      var profiles = users.map(function (val, i) {
        return val.user;
      });
      User.find({ profile_id: { $in: profiles } }).exec(function (
        err,
        usernames
      ) {
        //userMap = createUserMap(users, usernames);
        var numGames = createSessionObject(curSession);
        socketAPI.addGame({ code: data.code, numGames: numGames });
      });
    }
  });
};*/

/*socketAPI.gamesSubmitted = function (data) {
  var numGames = data.numGames;
  numGames[data.user].done = true;
  Session.findOne({code: data.code})
  io.sockets.emit(data.code + "gamesSubmit", data);
};*/

socketAPI.lockGames = function (data) {
  var ret = {};
  console.log("locking, ", data.code);
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    curSession.lock = "#postPostSelectView";
    ret.lockBack = true;
    ret.lock = "#postSelectView";
    console.log("sending " + data.code + "client with data", ret);
    io.sockets.emit(data.code + "client", ret);
    curSession.save();
  });
};

socketAPI.unlockGames = function (data) {
  console.log("unlock: ", data);
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    var ret = {};
    curSession.lock = "#postSelectView";
    ret.unlockBack = true;
    ret.unlock = "selectView";
    /*for (var i = 0; i < curSession.games.length; i++) {
      if ((curSession.games[i].addedBy == [])) {
        curSession.games[i].addedBy = [data.user];
      }
    }*/
    console.log("saving...", ret);
    curSession.save(function () {
      console.log("saved! Emitting " + data.code + "client", ret);
      io.sockets.emit(data.code + "client", ret);
      console.log("emitted");
    });
  });
};

socketAPI.startVoting = function (data) {
  console.log("starting voting", data);
  //Get the votes array from the session object
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    //Then send that list
    var ret = [];
    for (i = 0; i < curSession.votes.length; i++) {
      if (curSession.votes[i].active) {
        ret.push({
          game: curSession.votes[i].game,
          name: curSession.votes[i].name,
        });
      }
    }
    io.sockets.emit(data.code + "client", { startVoting: true, games: ret });
    io.sockets.emit(data.code + "owner", { startVoting: true, games: ret });
    curSession.lock = "#voteView";
    curSession.save();
  });
};

socketAPI.initVotes = function (data) {
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    emitVotes(curSession);
  });
};

socketAPI.submitVotes = function (data) {
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    console.log(data);
    var index = curSession.users.findIndex(
      (obj) => obj.user.toString() == data.user.toString()
    );
    if (index > -1) {
      curSession.users[index].doneVoting = true;
    }
    for (var i = 0; i < data.voteArray.length; i++) {
      var index = curSession.votes.findIndex(
        (obj) => obj.game.toString() == data.voteArray[i].game.toString()
      );
      var indexa = curSession.votes[index].voters.findIndex(
        (obj) => obj.user == data.user
      );
      console.log(index, indexa);
      if (indexa == -1) {
        curSession.votes[index].voters.push({
          user: data.user,
          vote: data.voteArray[i].vote,
        });
      } else {
        curSession.votes[index].voters[indexa] ==
          { user: data.user, vote: data.voteArray[i].vote };
      }
    }
    curSession.save(function (err) {
      emitVotes(curSession);
    });
  });
};

socketAPI.test = function (data) {
  console.log("Socket tested");
  Session.findOne({ code: data.code }).exec(function (err, curSession) {
    curSession.save(function (err) {
      var users = [];
      console.log("Test User: " + curSession.users[0].user);
      User.findOne({ profile_id: curSession.users[0].user })
        .select({ profile_id: 1, name: 1 })
        .exec(function (err, curUsers) {
          console.log("Length: " + curUsers.length);
          /*for (var i = 0; i < curUsers.length; i++) {
            var index = curSession.users.findIndex(
              (obj) => obj.user == curUsers[i].profile_id
            );
            users.push({
              doneVoting: curSession.users[index].doneVoting,
              name: curUsers[i].name,
            });
            console.log("Userlength: " + users.length);
          }*/
          /*io.sockets.emit(curSession.code + "owner", {
            voteSubmit: true,
            users: users,
          });*/
        });
    });
  });
};

function emitVotes(curSession) {
  var userList = [];
  var users = [];
  /*users: {
        doneVoting: Boolean
        name: "Username String (first name)"
      }
    */
  for (var i = 0; i < curSession.users.length; i++) {
    userList.push(curSession.users[i].user);
  }
  /*User.find({ profile_id: { $in: userList } })
    .select({ profile_id: 1, name: 1 })
    .exec(function (err, curUsers) {
      console.log("userList: ", userList);
      console.log("curUsers: ", curUsers);
      for (var i = 0; i < curUsers.length; i++) {
        var index = curSession.users.findIndex(
          (obj) => obj.user == curUsers[i].profile_id
        );*/
  for (var i = 0; i < curSession.users.length; i++) {
    console.log(curSession.users[i].name);
    users.push({
      doneVoting: curSession.users[i].doneVoting,
      name: curSession.users[i].name,
    });
  }
  console.log(curSession.code, users);
  io.sockets.emit(curSession.code + "owner", {
    voteSubmit: true,
    users: users,
  });
  /* });*/
}

socketAPI.endVote = function (data) {
  io.sockets.emit(data.code + "owner", { play: true, games: data.games });
  io.sockets.emit(data.code + "client", { play: true, games: data.games });
};

socketAPI.setLimit = function (data) {
  io.sockets.emit(data.code + "owner", { limit: data.limit });
  io.sockets.emit(data.code + "client", { limit: data.limit });
};

io.on("connection", function (socket) {
  var id = null;
  var code = null;
  socket.on("addGame", (data) => {
    console.log("addgame was called");
    socketAPI.addGame(data);
  });
  socket.on("id", (data) => {
    id = data.id;
    code = data.code;
  });
  socket.on("disconnect", function (socket) {
    console.log("User " + id + " disconnected from session " + code);
    if (id != null && code != null && code != "") {
      Session.findOne({ code: code }).exec(function (err, curSession) {
        var index = curSession.users.findIndex((obj) => {
          return obj.user == "guest" + id;
        });
        if (index > -1) {
          curSession.users.splice(index, 1);
          console.log("Deleting ", id);
          console.log(curSession.users);
          curSession.save().then(function () {
            socketAPI.addGame({ code: code });
          });
        } else {
          console.log("User " + id + " disconnected but wasn't in the list");
        }
      });
    }
  });
  console.log("User " + id + " connected");
});

module.exports = socketAPI;
