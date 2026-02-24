/**
 * Internal API Controller — called by other microservices (core-service)
 * These endpoints manage conversation lifecycle from cross-service operations.
 */

const { DocPatConversation, DocNurConversation } = require("../models/conversations-model");
const Message = require("../models/messages-model");

// ─── Doctor ↔ Patient Conversations ───────────────────────────────────────────

/**
 * Create a doctor-patient conversation
 * Called by core-service when a new patient is added
 */
const createDocPatConversation = async (req, res) => {
  try {
    const { conversation_id, doctor_id, patient_id, patient_name } = req.body;
    const conversation = new DocPatConversation({
      conversation_id,
      doctor_id,
      patient_id,
      patient_name,
      last_message: "",
    });
    await conversation.save();
    res.status(201).json({ status: "success", data: { conversation } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Delete a doctor-patient conversation and its messages
 * Called by core-service when a patient is deleted
 */
const deleteDocPatConversation = async (req, res) => {
  try {
    const { conversation_id } = req.params;
    await DocPatConversation.deleteOne({ conversation_id });
    await Message.deleteMany({ conversation_id });
    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Update a doctor-patient conversation
 * Called by core-service when a patient is updated
 */
const updateDocPatConversation = async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const updated = await DocPatConversation.findOneAndUpdate(
      { conversation_id },
      { $set: req.body },
      { new: true }
    );
    res.status(200).json({ status: "success", data: { conversation: updated } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// ─── Doctor ↔ Nurse Conversations ─────────────────────────────────────────────

/**
 * Bulk-create doctor-nurse conversations
 * Called by core-service when a new nurse or doctor is added
 * Expects body: { conversations: [{ conversation_id, doctor_id, nurse_id, nurse_name, doctor_name }, ...] }
 */
const bulkCreateDocNurConversations = async (req, res) => {
  try {
    const { conversations } = req.body;
    if (!conversations || !Array.isArray(conversations) || conversations.length === 0) {
      return res.status(200).json({ status: "success", data: { created: 0 } });
    }

    const docs = conversations.map((c) => ({
      conversation_id: c.conversation_id,
      doctor_id: c.doctor_id,
      nurse_id: c.nurse_id,
      nurse_name: c.nurse_name,
      doctor_name: c.doctor_name,
      last_message: "",
    }));

    const result = await DocNurConversation.insertMany(docs, { ordered: false });
    res.status(201).json({ status: "success", data: { created: result.length } });
  } catch (err) {
    // If some already exist (duplicate key), that's okay
    if (err.code === 11000) {
      return res.status(200).json({ status: "success", data: { note: "some conversations already existed" } });
    }
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Delete all doctor-nurse conversations for a specific nurse
 * Called by core-service when a nurse is deleted
 */
const deleteDocNurConversationsByNurse = async (req, res) => {
  try {
    const { nurse_id } = req.params;
    await DocNurConversation.deleteMany({ nurse_id });
    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Delete all doctor-nurse conversations for a specific doctor
 * Called by core-service when a doctor is deleted
 */
const deleteDocNurConversationsByDoctor = async (req, res) => {
  try {
    const { doctor_id } = req.params;
    await DocNurConversation.deleteMany({ doctor_id });
    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

module.exports = {
  createDocPatConversation,
  deleteDocPatConversation,
  updateDocPatConversation,
  bulkCreateDocNurConversations,
  deleteDocNurConversationsByNurse,
  deleteDocNurConversationsByDoctor,
};
