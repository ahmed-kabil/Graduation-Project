const Message = require("../models/messages-model");
const Conversation = require("../models/conversations-model");

/**
 * Send a message (stores in DB)
 */
const sendMessage = async (req, res) => {
  const { conversation_id, sender_id, receiver_id, message, patient_name, doctor_id, patient_id } = req.body;
  try {
    let newMsg = await new Message({
      conversation_id: conversation_id,
      sender_id: sender_id,
      receiver_id: receiver_id,
      message: message,
    });

    await newMsg.save();
    
    // Determine patient and doctor IDs for conversation upsert
    const derivedPatientId = patient_id || conversation_id.replace('conv_', '');
    const derivedDoctorId = doctor_id || (sender_id === derivedPatientId ? receiver_id : sender_id);
    const derivedPatientName = patient_name || derivedPatientId;

    // Upsert conversation — creates if it doesn't exist
    await Conversation.findOneAndUpdate(
      { conversation_id: conversation_id },
      {
        $set: {
          last_message: message,
          updated_at: Date.now(),
        },
        $setOnInsert: {
          conversation_id: conversation_id,
          doctor_id: derivedDoctorId,
          patient_id: derivedPatientId,
          patient_name: derivedPatientName,
        },
      },
      { upsert: true, new: true }
    );

    res.json({ status: "success", data: newMsg });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

/**
 * Get all messages in a conversation
 */
const getMessages = async (req, res) => {
  const { conv_id } = req.params;

  try {
    const messages = await Message.find({ conversation_id: conv_id }).sort({
      timestamp: 1,
    });

    res.json({ status: "success", data: { messages: messages } });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

/**
 * Mark messages as read
 */
const markMessagesAsRead = async (req, res) => {
  const { conversation_id, user_id } = req.body;
  try {
    await Message.updateMany(
      { conversation_id: conversation_id, receiver_id: user_id, read: false },
      { read: true }
    );
    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

module.exports = { sendMessage, getMessages, markMessagesAsRead };
