//Set up mongoose connection
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

//Create schema
var UserSchema = new Schema({
  profile_id: String,
  name: String,
  games: [
    {
      game_id: Number,
      lists: [Number],
    },
  ],
});

//Ok, I probably don't need the userCreate function as such. I'm never going to set the user in the database
//unless I'm also setting a game. So this is what it looks like to set a user, but the next
//step is to cannibalize this function to use in a request to add a game. That looks like this:

function userCreate(profile_id, name) {
  var userdetail = {
    profile_id: profile_id,
    name: name,
    games: [],
  };
  var user = new UserSchema(userdetail);

  user.save(function (err) {
    if (err) {
      return next(err);
    }
    res.send("added user " + name);
  });
}

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
