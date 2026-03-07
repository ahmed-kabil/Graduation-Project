const express = require("express");
const { verifyToken } = require("../middleware/verify_token");
const {
  getDocConversationsWithPat,
  getDocConversationsWithNur,
  getNurConversationsWithDoc,
  deleteDocPatConversation,
  deleteDocNurConversation,
} = require("../controllers/conversations_controller");

const router = express.Router();

router.route("/pats_of_doc/:doc_id").get(verifyToken, getDocConversationsWithPat);
router.route("/nurs_of_doc/:doc_id").get(verifyToken, getDocConversationsWithNur);
router.route("/docs_of_nur/:nur_id").get(verifyToken, getNurConversationsWithDoc);
router.route("/doc-pat/:conversation_id").delete(verifyToken, deleteDocPatConversation);
router.route("/doc-nur/:conversation_id").delete(verifyToken, deleteDocNurConversation);

module.exports = router;
