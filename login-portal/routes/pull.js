const express = require("express");
const mysql = require('mysql');

const router = express.Router();


// Home page
router.post("/pull", (req, res) => {
    /*
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
    var getGamesets = function(callback) {
    connection.query(theQuery , function (err, result) {
        if (err) {
        callback(err, null);
        } else {}
        callback(err, result);
    });
    } 
    var games = getGamesets();
    */
    res.send(req.body);
});
//now just send a javascript fetch request here and I can make a whole sql query


module.exports = router;