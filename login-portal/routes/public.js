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

router.post("/getuser", (req, res) => {
  connection.query('SELECT * from lists WHERE list_user_id = ?', user.id, function(err, qres, fields) {
    if (err) {res.send(err)};
    res.send(qres);
  })
});

router.post("/getgames", (req, res) => {
  var userid = req.body.id;
  connection.query('SELECT * from lists WHERE list_user_id = ?', userid, function(err, qres, fields) {
    if (err) {res.send(err)};
    res.send(qres);
  })
});


module.exports = router;
