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

//Get user lists
router.post("/getuser", (req, res) => {
  if (req.user) {
    var userid = req.user.id;
    var sqlquery = `SELECT * from lists WHERE list_user_id = '<` + userid + `>'`;
    connection.query(sqlquery, function(err, qres, fields) {
      if (err) {res.send(err)};
      res.send(qres);
    })
  } else {
    res.send('no user');
  }
});


module.exports = router;
