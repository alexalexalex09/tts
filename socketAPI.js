var socket_io = require("socket.io");
var io = socket_io();
var socketAPI = {};
var numGames = {};
socketAPI.io = io;

socketAPI.sendNotification = function (data) {
  io.sockets.emit("hello", { msg: data });
};

//Receive the add game event from toggling the switch, including the number
//of that user's added games from MongoDB
socketAPI.addGame = function (data) {
  numGames[data.user] = data.numGames;
  io.sockets.emit(data.code, numGames);
};

io.on("connection", function (socket) {
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
