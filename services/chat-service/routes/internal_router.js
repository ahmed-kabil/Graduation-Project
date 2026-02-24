/**
 * Internal API Routes — used by other microservices for cross-service operations.
 * These routes are NOT exposed to external clients via the API gateway.
 */

const express = require("express");
const router = express.Router();
const {
  createDocPatConversation,
  deleteDocPatConversation,
  updateDocPatConversation,
  bulkCreateDocNurConversations,
  deleteDocNurConversationsByNurse,
  deleteDocNurConversationsByDoctor,
} = require("../controllers/internal_controller");

// Doctor ↔ Patient conversation lifecycle
router.post("/conversations/doc-pat", createDocPatConversation);
router.delete("/conversations/doc-pat/:conversation_id", deleteDocPatConversation);
router.patch("/conversations/doc-pat/:conversation_id", updateDocPatConversation);

// Doctor ↔ Nurse conversation lifecycle
router.post("/conversations/doc-nur/bulk", bulkCreateDocNurConversations);
router.delete("/conversations/doc-nur/by-nurse/:nurse_id", deleteDocNurConversationsByNurse);
router.delete("/conversations/doc-nur/by-doctor/:doctor_id", deleteDocNurConversationsByDoctor);

module.exports = router;
