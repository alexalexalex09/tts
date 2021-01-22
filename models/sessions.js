//Set up mongoose connection
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

//Create schema
var SessionSchema = new Schema(
  {
    owner: String,
    phrase: String,
    creation: {
      type: Date,
      //expires: 2592000, Will have to use a mongoose cron package to manually
      //unset the code of a document that has expired for a non-premium user
      default: Date.now,
      required: true,
    },
    code: String,
    lock: { type: String, default: "selectView" },
    //selectView, postSelectView, postPostSelectView, voteView, postVoteView, playView
    limit: Number,
    games: [
      {
        game: { type: Schema.Types.ObjectId, ref: "Game" },
        addedBy: [String],
        minPlayers: Number,
        maxPlayers: Number,
      },
    ],
    users: [
      {
        user: String,
        name: String,
        done: { type: Boolean, default: false },
        doneVoting: { type: Boolean, default: false },
        privateNote: { type: String, default: "" },
        votes: [{ id: String, vote: Number }],
        voteIncrementer: Number,
      },
    ],
    votes: [
      {
        game: { type: Schema.Types.ObjectId, ref: "Game" },
        name: String,
        voters: [{ user: String, vote: Number }],
        active: { type: Boolean, default: true },
      },
    ],
  },
  {
    collection: "sessions",
  }
);
SessionSchema.statics.findUser = function (user) {
  return this.find({ name: new RegExp(user, "i") }).project({
    "users.user": 1,
  });
};

module.exports = mongoose.model("Session", SessionSchema);
/*

//Export function to create "SomeModel" model class
module.exports = mongoose.model('SomeModel', SomeModelSchema );

You can then require and use the model immediately in other files. Below we show how you might use it to get all instances of the model.

//Create a SomeModel model just by requiring the module
var SomeModel = require('../models/somemodel')

// Use the SomeModel object (model) to find all SomeModel records
SomeModel.find(callback_function);
*/
