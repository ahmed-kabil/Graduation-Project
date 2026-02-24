const express = require("express");
const router = express.Router();
const controller = require("../controllers/appointments_controller");
const { verifyToken } = require("../middleware/verify_token");

router.route("/add").post(verifyToken, controller.createAppointment);
router.route("/for_doc/:doc_id").get(verifyToken, controller.getDocAppointment);
router.route("/for_pat/:pat_id").get(verifyToken, controller.getPatAppointment);
router.route("/fulfill").post(verifyToken, controller.markAppointmentAsFulfilled);
router.route("/:appo_id").delete(verifyToken, controller.deleteAppointment);

module.exports = router;
