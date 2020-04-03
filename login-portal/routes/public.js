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

//get current user games for specified list
//parameter: list_id
router.post("/get_user_list_games", (req, res) => {
  if (req.user) {
    var userid = req.user.id;
    var listid = req.body.list;
    var sqlquery = `SELECT ug_game_id FROM users_x_games WHERE ug_user_id = '<` + userid + `>' AND ug_list_id = ` + listid + ``;
    //TODO: Change this query to take the selected ug_game_id and look up the game name
    connection.query(sqlquery, function(err, qres, fields) {
      if (err) {res.send(err)};
      console.log(qres);
      res.send(qres);
      
    })
  } else {
    res.send('no user');
  }
});


module.exports = router;
