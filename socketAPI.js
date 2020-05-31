var socket_io = require("socket.io");
var io = socket_io();
var socketAPI = {};

socketAPI.io = io;

io.on("connection", function (socket) {
  console.log("A user connected");
});

socketAPI.sendNotification = function () {
  io.sockets.emit("hello", { msg: "Hello World!" });
};

module.exports = socketAPI;

//var io = socket_io();
//app.io = io; //This is bad, I need to understand module.exports
//see stackoverflow.com/questions/24609991

/**
 * Start socket listening
 */
//io.on("connection", (socket) => {
//  console.log("user connected");
/* 
    This needs to:
      1) Hear from the client which session the user is currently owning (if any)
      2) If a session is owned, notice when the Session document for that user's owned session is changed
      3) Emit an event to the client with
        1) Each connected user
        2) Each user's number of added games
    */
//});
