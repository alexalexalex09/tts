let mongoose = require("mongoose");

var mongoDB = process.env.mongo;
mongoose.connect(mongoDB, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  useCreateIndex: true,
  w: "majority",
  family: 4,
});
mongoose.Promise = global.Promise;
mongoose.connection.on(
  "error",
  console.error.bind(console, "MongoDB connection error:")
);

module.exports = mongoose;
