/**
 * Socket.io Handler for Real-time Chat
 * Supports: Doctor↔Patient and Doctor↔Nurse messaging channels
 */

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("👤 User connected:", socket.id);

    // Track user online (logging only — no in-memory tracking)
    socket.on("online", (user_id) => {
      console.log("✅ User " + user_id + " is now online");
    });

    // Join conversation room
    socket.on("joinConversation", (conversation_id) => {
      socket.join(conversation_id);
      console.log(socket.id + " joined conversation:", conversation_id);
    });

    /**
     * Doctor ↔ Patient messaging
     */
    socket.on("sendDocPatMessage", async (data) => {
      try {
        console.log(data.sender_id + " sent a doc-pat message");

        const Message = require("../models/messages-model");
        const { DocPatConversation } = require("../models/conversations-model");

        if (!data.conversation_id || !data.sender_id || !data.receiver_id || !data.message) {
          return socket.emit("errorMessage", { error: "Invalid message data" });
        }

        // Emit first for lower latency, then persist
        io.to(data.conversation_id).emit("receiveDocPatMessage", data);

        const savedMsg = await Message.create(data);

        const patientId = data.patient_id || data.conversation_id.replace("conv_", "");
        const doctorId = data.doctor_id || (data.sender_id === patientId ? data.receiver_id : data.sender_id);
        const patientName = data.patient_name || patientId;

        await DocPatConversation.findOneAndUpdate(
          { conversation_id: data.conversation_id },
          {
            $set: { last_message: data.message, updated_at: Date.now() },
            $setOnInsert: {
              conversation_id: data.conversation_id,
              doctor_id: doctorId,
              patient_id: patientId,
              patient_name: patientName,
            },
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error("❌ Error in sendDocPatMessage:", err);
        socket.emit("errorMessage", { error: "Message could not be sent" });
      }
    });

    /**
     * Doctor ↔ Nurse messaging
     */
    socket.on("sendDocNurMessage", async (data) => {
      try {
        console.log(data.sender_id + " sent a doc-nur message");

        const Message = require("../models/messages-model");
        const { DocNurConversation } = require("../models/conversations-model");

        if (!data.conversation_id || !data.sender_id || !data.receiver_id || !data.message) {
          return socket.emit("errorMessage", { error: "Invalid message data" });
        }

        // Emit first for lower latency, then persist
        io.to(data.conversation_id).emit("receiveDocNurMessage", data);

        const savedMsg = await Message.create(data);

        await DocNurConversation.findOneAndUpdate(
          { conversation_id: data.conversation_id },
          {
            $set: { last_message: data.message, updated_at: Date.now() },
          },
          { new: true }
        );
      } catch (err) {
        console.error("❌ Error in sendDocNurMessage:", err);
        socket.emit("errorMessage", { error: "Message could not be sent" });
      }
    });

    // Handle new appointment notification
    socket.on("newAppointment", (data) => {
      console.log("📅 New appointment notification:", data);
      io.to(data.conversation_id).emit("newAppointment", data);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("👋 User disconnected:", socket.id);
    });
  });
};
