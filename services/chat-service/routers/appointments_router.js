const express = require("express");
const {verifyToken ,verify_RA,verify_A,verify_APND,verify_AD} = require("../middleware/verify_token.js")
const { createAppointment ,getDocAppointment , getPatAppointment,markAppointmentAsFulfilled , DeleteAppointment} = require("../controllers/appointments_controller.js");

const router = express.Router();


router.route("/add")
     .post(verifyToken,createAppointment);   //

router.route("/for_doc/:doc_id")
     .get(verifyToken,getDocAppointment);   //

router.route("/for_pat/:pat_id")
     .get(verifyToken,getPatAppointment);   //

router.route("/fulfill")
     .post(verifyToken,markAppointmentAsFulfilled);   //

router.route("/:appo_id")
     .delete(verifyToken,DeleteAppointment);   //

module.exports = router;
