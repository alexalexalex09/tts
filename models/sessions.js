//Set up mongoose connection
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

//Create schema
var SessionSchema = new Schema(
  {
    owner: String,
    creation: {
      type: Date,
      expires: 2000,
      //2592000
      default: Date.now,
      required: true,
    },
    code: String,
    lock: { type: String, default: "selectView" },
    //selectView, postSelectView, postSelectEditView, voteView, postVoteView, resultView
    games: [
      {
        game: { type: Schema.Types.ObjectId, ref: "Game" },
        addedBy: [String],
      },
    ],
    users: [{ user: String, done: Boolean }],
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
