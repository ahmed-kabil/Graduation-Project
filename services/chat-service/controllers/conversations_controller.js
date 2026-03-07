const { DocPatConversation, DocNurConversation } = require("../models/conversations-model");
const Message = require("../models/messages-model");

/**
 * Get a doctor's conversations with patients
 */
const getDocConversationsWithPat = async (req, res) => {
  const doc_id = req.params.doc_id;
  try {
    const docConversations = await DocPatConversation.find({ doctor_id: doc_id });
    if (!docConversations) return res.status(404).json({ status: "fail", data: null });
    res.json({ status: "success", data: { docConversations } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Get a doctor's conversations with nurses
 */
const getDocConversationsWithNur = async (req, res) => {
  const doc_id = req.params.doc_id;
  try {
    const docConversations = await DocNurConversation.find({ doctor_id: doc_id });
    if (!docConversations) return res.status(404).json({ status: "fail", data: null });
    res.json({ status: "success", data: { docConversations } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Get a nurse's conversations with doctors
 */
const getNurConversationsWithDoc = async (req, res) => {
  const nur_id = req.params.nur_id;
  try {
    const nurConversations = await DocNurConversation.find({ nurse_id: nur_id });
    if (!nurConversations) return res.status(404).json({ status: "fail", data: null });
    res.json({ status: "success", data: { nurConversations } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Delete a doctor-patient conversation and all its messages
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
 * Delete a doctor-nurse conversation and all its messages
 */
const deleteDocNurConversation = async (req, res) => {
  try {
    const { conversation_id } = req.params;
    await DocNurConversation.deleteOne({ conversation_id });
    await Message.deleteMany({ conversation_id });
    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

module.exports = { getDocConversationsWithPat, getDocConversationsWithNur, getNurConversationsWithDoc, deleteDocPatConversation, deleteDocNurConversation };
