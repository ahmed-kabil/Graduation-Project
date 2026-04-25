
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

/**
 * Socket.io Handler for Real-time Chat
 * Supports: Doctor↔Patient and Doctor↔Nurse messaging channels
 */

module.exports = async (io) => {

// 1. Setup Redis Adapter for K8s Scaling
  const redisUrl = process.env.REDIS_URL || "redis://redis-srv:6379";
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('❌ Redis Pub Error:', err));
  subClient.on('error', (err) => console.error('❌ Redis Sub Error:', err));

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("✅ Redis adapter connected. Scaling enabled!");
  } catch (err) {
    console.error("⚠️ Redis Connection Failed. App will run in single-pod mode.", err);
  }

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

        // Save first so we get the DB-generated _id and timestamp
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

        // Emit to room with DB-generated _id and timestamp
        const emitData = { ...data, _id: savedMsg._id.toString(), timestamp: savedMsg.timestamp };
        io.to(data.conversation_id).emit("receiveDocPatMessage", emitData);
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

        // Save first so we get the DB-generated _id and timestamp
        const savedMsg = await Message.create(data);

        await DocNurConversation.findOneAndUpdate(
          { conversation_id: data.conversation_id },
          {
            $set: { last_message: data.message, updated_at: Date.now() },
          },
          { new: true }
        );

        // Emit to room with DB-generated _id and timestamp
        const emitData = { ...data, _id: savedMsg._id.toString(), timestamp: savedMsg.timestamp };
        io.to(data.conversation_id).emit("receiveDocNurMessage", emitData);
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

    // Handle appointment cancellation notification
    socket.on("cancelAppointment", (data) => {
      console.log("🗑️ Appointment cancellation notification:", data);
      io.to(data.conversation_id).emit("cancelAppointment", data);
    });

    /**
     * Real-time read receipts
     * When a user marks messages as read, broadcast to the conversation
     * so the sender's UI can update ✓ → ✓✓ instantly.
     */
    socket.on("messagesRead", async (data) => {
      // data = { conversation_id, reader_id }
      if (data && data.conversation_id && data.reader_id) {
        try {
          const Message = require("../models/messages-model");
          await Message.updateMany(
            { conversation_id: data.conversation_id, receiver_id: data.reader_id, read: false },
            { read: true }
          );
        } catch (err) {
          console.error("❌ Error updating read status in DB:", err);
        }
        // Broadcast to all participants in the conversation room
        io.to(data.conversation_id).emit("messagesRead", data);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("👋 User disconnected:", socket.id);
    });
  });
};
