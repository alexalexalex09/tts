//Set up mongoose connection
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

//Create schema
var UserSchema = new Schema(
  {
    profile_id: String,
    name: String,
    lists: {
      allGames: [{ type: Schema.Types.ObjectId, ref: "Game" }],
      custom: [
        {
          name: String,
          games: [{ type: Schema.Types.ObjectId, ref: "Game" }],
          listCode: String,
        },
      ],
      templates: [
        {
          name: String,
          games: [{ type: Schema.Types.ObjectId, ref: "Game" }],
          templateCode: String,
        },
      ],
    },
    preferences: {
      darkMode: Boolean,
    },
    bgg: {
      username: String,
      collection: [
        {
          name: String,
          id: Number,
          image: String,
          minplayers: Number,
          maxplayers: Number,
          minplaytime: Number,
          maxplaytime: Number,
          playingtime: Number,
          rating: Number,
          rank: Number,
          family: String,
          own: Number,
          want: Number,
          wanttoplay: Number,
          wanttobuy: Number,
          wishlist: Number,
          plays: Number,
        },
      ],
    },
  },
  { collection: "users" }
);

module.exports = mongoose.model("User", UserSchema);
/*

//Export function to create "SomeModel" model class
module.exports = mongoose.model('SomeModel', SomeModelSchema );

You can then require and use the model immediately in other files. Below we show how you might use it to get all instances of the model.

//Create a SomeModel model just by requiring the module
var SomeModel = require('../models/somemodel')

// Use the SomeModel object (model) to find all SomeModel records
SomeModel.find(callback_function);
*/
