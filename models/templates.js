//Set up mongoose connection
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

//Create schema
var TemplateSchema = new Schema(
  {
    owner: String,
    name: String,
    templateCode: String,
    games: [{ type: Schema.Types.ObjectId, ref: "Game" }],
  },
  {
    collection: "templates",
  }
);

module.exports = mongoose.model("Template", TemplateSchema);
/*

//Export function to create "SomeModel" model class
module.exports = mongoose.model('SomeModel', SomeModelSchema );

You can then require and use the model immediately in other files. Below we show how you might use it to get all instances of the model.

//Create a SomeModel model just by requiring the module
var SomeModel = require('../models/somemodel')

// Use the SomeModel object (model) to find all SomeModel records
SomeModel.find(callback_function);
*/
