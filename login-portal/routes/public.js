const express = require("express");
const mysql = require('mysql');

const router = express.Router();

function getMySQLConnection() {
	return mysql.createConnection({
	  host     : 'localhost',
	  user     : 'alexmufm_tts',
	  password : 'UusqLhw&uk,1',
	  database : 'alexmufm_tts_test'
	});
}

var theQuery = "SELECT * from H48f_gamesets where user_id = '"+user.id+"'";
var connection = getMySQLConnection();
var getGamesets = function() {
  connection.connect(function(err) {
    if (err) throw err;
    // this isn't ready yet: return doesn't work here, use callback() instead
    //https://nodejs.org/en/knowledge/getting-started/control-flow/what-are-callbacks/
    
    connection.query(theQuery , function (err, result) {
      if (err) throw err;
      return result;
    });
  }); 
} 
var games = getGamesets();
// Home page
router.get("/", (req, res) => {
  res.render("index", {games: games, theQuery: theQuery});
});


module.exports = router;