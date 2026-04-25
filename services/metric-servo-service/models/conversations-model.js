const mongoose = require("mongoose");

const DocPat_ConversationSchema = new mongoose.Schema({
  conversation_id: { type: String, unique: true, required: true },
  doctor_id: { type: String, required: true },
  patient_id: { type: String, required: true },
  patient_name:{ type: String, required: true },
  last_message: { type: String },
  updated_at: { type: Date, default: Date.now },
});

const DocNur_ConversationSchema = new mongoose.Schema({
  conversation_id: { type: String, unique: true, required: true },
  doctor_id: { type: String, required: true },
  nurse_id: { type: String, required: true },
  nurse_name:{ type: String, required: true },
  doctor_name:{ type: String, required: true },
  last_message: { type: String },
  updated_at: { type: Date, default: Date.now },
});



const DocPatConversation = mongoose.model(
  "DocPatConversation",
  DocPat_ConversationSchema
);

const DocNurConversation = mongoose.model(
  "DocNurConversation",
  DocNur_ConversationSchema
);

module.exports = {
  DocPatConversation,
  DocNurConversation,
};

