const express = require("express");
const mysql = require('mysql');

const router = express.Router();


// Home page
router.get("/", (req, res) => {
  res.render("index");
});


module.exports = router;
