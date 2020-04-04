const express = require("express");
const mysql = require('mysql');
const router = express.Router();


//create mysql connection
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'tts_test'
})

//TODO: Add mysql pool
connection.connect(function(err) {
  if (err) throw err;
});


// Home page
router.get("/", (req, res) => {
  res.render("index");
});


router.get("/logindata", (req, res) => {
  var data;
  connection.query('SELECT * from test_data WHERE game_id = ?', ["1"], function(err, qres, fields) {
    if (err) {res.send(err)};
    res.send(qres[0].game_name);
  })
  //connection.end();
});

//Get current user lists
router.post("/get_user_lists", (req, res) => {
  if (req.user) {
    var userid = req.user.id;
    var sqlquery = `SELECT * from lists WHERE list_user_id = '<` + userid + `>'`;
    connection.query(sqlquery, function(err, qres, fields) {
      if (err) {res.send(err)};
      res.send(qres);
    })
  } else {
    res.send({ err: 'no user' });
  }
});

//get all current user games
router.post("/get_user_all_games", (req, res) => {
  if (req.user) {
    var userid = req.user.id;
    var sqlquery = `SELECT games.game_name, games.game_id
                    FROM games 
                    INNER JOIN users_x_games 
                    ON games.game_id=users_x_games.ug_game_id 
                    AND users_x_games.ug_user_id='<` + userid + `>'`
    //TODO: Right now this query shows every game on every list, even if the
    //game is on multiple lists. It should only list each game once.
    connection.query(sqlquery, function(err, qres, fields) {
      if (err) {res.send(err)};
      res.send(qres);
    })
  } else {
    res.send({err: 'sql error'});
  }
});

//get current user games for specified list
//parameter: list: the list id to retrieve from the database
router.post("/get_user_list_games", (req, res) => {
  if (req.user) {
    var userid = req.user.id;
    var listid = req.body.list;
    var sqlquery = `SELECT games.game_name, games.game_id
                    FROM games 
                    INNER JOIN users_x_games 
                    ON games.game_id=users_x_games.ug_game_id 
                    AND users_x_games.ug_user_id='<` + userid + `>' 
                    AND users_x_games.ug_list_id=` + listid
    connection.query(sqlquery, function(err, qres, fields) {
      if (err) {res.send(err)};
      res.send(qres);
    })
  } else {
    res.send({err: 'sql error'});
  }
});


module.exports = router;
