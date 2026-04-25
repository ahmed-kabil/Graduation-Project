const express = require("express");
const { getMetrics } = require("../controllers/metrics_controller.js");

const router = express.Router();



router.route("/")
     .get(getMetrics);   //

module.exports = router;
