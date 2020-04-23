const express = require("express");
const mysql = require("mysql");
const router = express.Router();
var cfenv = require("cfenv");
var mongoose = require("mongoose");
var User = require("../models/users.js");
var Game = require("../models/games.js");

//CF variables
var appEnv = cfenv.getAppEnv();
var sURL = appEnv.getServiceURL("ad_16459ca7380ad71");
if (appEnv.port == 6002) {
  var baseURL = appEnv.url.slice(0, appEnv.url.length - 4) + 3000;
} else {
  var baseURL = appEnv.url;
}

var mongoDB =
  "mongodb+srv://alextts:iyJaon1sWAdMDA3c@alexcluster-c7uv8.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

//New Mongo method to add a game to a user, whether the user already exists or not
router.post("/game_add", function (req, res) {
  //check if user is logged in
  if (req.user) {
    //check if user is already in the database, add if not
    User.find({ profile_id: req.user.id })
      .then(function (err, qres) {
        if (typeof err.stack != "undefined") {
          res.send("Error finding user");
        }
        res.send(qres);
        //userCreate(req.user.id, req.user.profile.firstName); //TODO
      })
      .then(function (err, qres) {
        //now that we're certain the user's been added (Maybe error handling here?)
        //check if the game has already been added by another user
        if (Game.find({ name: req.name })) {
          //if it is, put it in game_id and continue to add
          game_id = Game.find({ name: req.name });

          //check if game has already been added by this user
          if (User.find({ "games.game_id": game_id })) {
            //if so, send an error
            res.send("Already added game " + req.name + " with id " + game_id);
          } else {
            //Otherwise continue:
            //Update the field to push the (verified) new game to the (verified) user's game list
            User.updateOne(
              { profile_id: req.user.id },
              {
                $push: {
                  games: {
                    game_id: game_id,
                    lists: [],
                  },
                },
              }
            ).then(function (err, qres) {
              if (err) {
                res.send("error updating: " + err);
              }
              res.send(qres);
            });
          }
        } else {
          //if the game hasn't yet been added, add it
          gameCreate(req.name, game_id); //TODO
        }
      });
  } else {
    res.send("Log in first!");
  }
});

function gameCreate(name) {
  //TODO
  var gamedetail = { name: name, rating: 0, owned: 0 };
  var game = new Game(gamedetail);
  game.save(function (err) {
    if (err) {
      return err;
    }
  });
}

function userCreate(id, name) {
  //TODO
  var userdetail = {
    profile_id: id,
    name: name,
    games: [],
  };
  var user = new User(userdetail);
  user.save(function (err) {
    if (err) {
      return err;
    }
  });
}

/*
//Promisify mysql using the Database class
class Database {
  constructor(config) {
    this.connection = mysql.createConnection(config);
  }
  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
  close() {
    return new Promise((resolve, reject) => {
      this.connection.end((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

//config for database variable
var dbConfig = {
  host: "localhost",
  user: "root",
  password: "admin",
  database: "tts_test",
};
//create new Database object called database, this returns a promise
var database = new Database(dbConfig);

//create mysql connection
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin",
  database: "tts_test",
});

//TODO: Add mysql pool
connection.connect(function (err) {
  if (err) throw err;
});
*/
// Home page
router.get("/", (req, res) => {
  res.render("index", {
    appEnv: appEnv,
    redirect_uri: baseURL + "/users/callback",
  });
});

router.get("/logindata", (req, res) => {
  var data;
  connection.query(
    "SELECT * from test_data WHERE game_id = ?",
    ["1"],
    function (err, qres, fields) {
      if (err) {
        res.send(err);
      }
      res.send(qres[0].game_name);
    }
  );
  //connection.end();
});

//Get current user lists
router.post("/get_user_lists", (req, res) => {
  if (req.user) {
    var userid = req.user.id;
    var sqlquery =
      `SELECT * from lists WHERE list_user_id = '<` + userid + `>'`;
    connection.query(sqlquery, function (err, qres, fields) {
      if (err) {
        res.send(err);
      }
      res.send(qres);
    });
  } else {
    res.send({ err: "no user" });
  }
});

//get all current user games
router.post("/get_user_all_games", (req, res) => {
  if (req.user) {
    var userid = req.user.id;
    var sqlquery =
      `SELECT games.game_name, games.game_id
                    FROM games 
                    INNER JOIN users_x_games 
                    ON games.game_id=users_x_games.ug_game_id 
                    AND users_x_games.ug_user_id='<` +
      userid +
      `>'`;
    //TODO: Right now this query shows every game on every list, even if the
    //game is on multiple lists. It should only list each game once.
    connection.query(sqlquery, function (err, qres, fields) {
      if (err) {
        res.send(err);
      }
      res.send(qres);
    });
  } else {
    res.send({ err: "sql error" });
  }
});

//get current user games for specified list
//parameter: list: the list id to retrieve from the database
router.post("/get_user_list_games", (req, res) => {
  if (req.user) {
    var userid = req.user.id;
    var listid = req.body.list;
    var sqlquery =
      `SELECT games.game_name, games.game_id
                    FROM games 
                    INNER JOIN users_x_games 
                    ON games.game_id=users_x_games.ug_game_id 
                    AND users_x_games.ug_user_id='<` +
      userid +
      `>' 
                    AND users_x_games.ug_list_id=` +
      listid;
    connection.query(sqlquery, function (err, qres, fields) {
      if (err) {
        res.send(err);
      }
      res.send(qres);
    });
  } else {
    res.send({ err: "sql error" });
  }
});

//add games
//parameter: game: the game name to add

//This query should start a trigger on users_x_games that creates a duplicate entry
//in the users's "All Games" list and then double check the All Games list for
//duplicates in that list and remove any.

router.post("/add_user_game_unsorted", (req, res) => {
  //database.query(`INSERT INTO games (game_name) VALUES ('`+req.body.game+` being inserted')`);
  if (req.user) {
    var userid = req.user.id;
    var game = req.body.game;
    console.log(req.user.id + " " + game);
    var sqlA = `INSERT IGNORE INTO games (game_name) VALUES ('` + game + `')`;
    var gameid = 0;
    database
      .query(sqlA)
      .then(
        (rows) => {
          gameid = rows.insertId;
          var sqlB =
            `
          INSERT IGNORE INTO users_x_games(ug_list_id, ug_user_id, ug_game_id) 
          SELECT list_id, '<` +
            userid +
            `>', ` +
            gameid +
            ` 
          FROM lists 
          WHERE list_user_id='<` +
            userid +
            `>' 
          AND list_name='Unsorted'`;
          //database.query(`INSERT INTO games (game_name) VALUES ('`+userid+` and `+gameid+` being added to users_x_games')`);
          return database.query(sqlB);
        },
        (err) => {
          res.send({ err: "Error in sqlA: " + err });
        }
      )
      .then(
        (rows) => {
          gameid = rows.insertId;
          var resobj = { insertId: gameid };
          res.send(resobj);
        },
        (err) => {
          res.send({ err: "Error in sqlB: " + err });
        }
      )
      .catch((err) => {
        res.send({ err: "Error in promise chain: " + err });
      });
  } else {
    res.send({ user: req.user.id });
  }
});

module.exports = router;
