const express = require("express");
//const mysql = require('mysql');

const router = express.Router();

function getMySQLConnection() {
	return mysql.createConnection({
	  host     : 'localhost',
	  user     : 'alexmufm_tts',
	  password : 'UusqLhw&uk,1',
	  database : 'alexmufm_tts_test'
	});
}

var connection = getMySQLConnection();
connection.connect(function(err) {
  if (err) throw err;
  // this isn't ready yet:
  // connection.query('SELECT * from "users" where "id" = '+user.id)
  // if there's nothing in the result, add a new row, populating it with data from Okta's user object
  //
});




// Home page
router.get("/", (req, res) => {
  res.render("index");
});


module.exports = router;