/**
 * Socket.io Handler for Real-time Chat
 */

module.exports = (io) => {
  // Track online users
  let onlineUsers = {};

  io.on("connection", (socket) => {
    console.log("👤 User connected:", socket.id);

    // Track user online
    socket.on("online", (user_id) => {
      onlineUsers[user_id] = socket.id;
      console.log("✅ User " + user_id + " is now online");
    });

    // Join conversation room
    socket.on("joinConversation", (conversation_id) => {
      socket.join(conversation_id);
      console.log(socket.id + " joined conversation:", conversation_id);
    });

    // Send message
    socket.on("sendMessage", async (data) => {
      try {
        console.log(socket.id, "sent a message:", data);

        const Message = require("../models/messages-model");
        const Conversation = require("../models/conversations-model");

        // Validate
        if (!data.conversation_id || !data.sender_id || !data.receiver_id || !data.message) {
          return socket.emit("errorMessage", { error: "Invalid message data" });
        }

        // Save message to DB
        const savedMsg = await Message.create(data);

        // Determine patient and doctor IDs
        const patientId = data.patient_id || data.conversation_id.replace('conv_', '');
        const doctorId = data.doctor_id || (data.sender_id === patientId ? data.receiver_id : data.sender_id);
        const patientName = data.patient_name || patientId;

        // Upsert conversation — creates if it doesn't exist
        await Conversation.findOneAndUpdate(
          { conversation_id: data.conversation_id },
          {
            $set: {
              last_message: data.message,
              updated_at: Date.now(),
            },
            $setOnInsert: {
              conversation_id: data.conversation_id,
              doctor_id: doctorId,
              patient_id: patientId,
              patient_name: patientName,
            },
          },
          { upsert: true, new: true }
        );

        // Emit to all users in the room (include _id and timestamp from saved message)
        const emitData = {
          ...data,
          _id: savedMsg._id.toString(),
          timestamp: savedMsg.timestamp,
          read: savedMsg.read,
        };
        io.to(data.conversation_id).emit("receiveMessage", emitData);

      } catch (err) {
        console.error("❌ Error in sendMessage:", err);
        socket.emit("errorMessage", { error: "Message could not be sent" });
      }
    });

    // Handle new appointment notification
    socket.on("newAppointment", (data) => {
      console.log("📅 New appointment notification:", data);
      
      // Broadcast to the specific doctor if they are online
      if (data.doctorId && onlineUsers[data.doctorId]) {
        io.to(onlineUsers[data.doctorId]).emit("newAppointment", data);
        console.log("✅ Appointment notification sent to doctor:", data.doctorId);
      } else {
        // Broadcast to all connected clients (fallback)
        io.emit("newAppointment", data);
        console.log("📢 Appointment notification broadcasted to all");
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("👋 User disconnected:", socket.id);

      // Remove user from online list
      onlineUsers = Object.fromEntries(
        Object.entries(onlineUsers).filter(([_, id]) => id !== socket.id)
      );
    });
  });
};
