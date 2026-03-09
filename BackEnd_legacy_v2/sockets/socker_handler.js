module.exports = (io) => {

  // Track online users inside the socket module
 

  io.on("connection", (socket) => {

    
    
    console.log("User connected:", socket.id);

    // Track user online
    socket.on("online", (user_id) => {
      
      console.log("The user " + user_id + " is now online");
    });

    // Join conversation room
    socket.on("joinConversation", (conversation_id) => {
      socket.join(conversation_id);
      console.log(socket.id + " joined conversation:", conversation_id);
    });

    // Send message
    socket.on("sendDocPatMessage", async (data) => {
      try {
        console.log(data.sender_id, "sent a message:", data);

        
        // Validate
        if (!data.conversation_id || !data.sender_id || !data.receiver_id || !data.message) {
          return socket.emit("errorMessage", { error: "Invalid message data" });
        }
        
        // Save message to DB first so we get the generated _id and timestamp
        const Message = require("../models/messages-model");
        const {DocPatConversation} = require("../models/conversations-model");

        const savedMsg = await Message.create(data);

        await DocPatConversation.findOneAndUpdate(
          { conversation_id: data.conversation_id },
          {
            last_message: data.message,
            updated_at: Date.now(),
          }
        );

        // Emit to all users in the room with DB-generated _id and timestamp
        const emitData = { ...data, _id: savedMsg._id.toString(), timestamp: savedMsg.timestamp };
        io.to(data.conversation_id).emit("receiveDocPatMessage", emitData);


      } catch (err) {
        console.error("Error in sendMessage:", err);
        socket.emit("errorMessage", { error: "Message could not be sent" });
      }
    });
///////////////////////////////////
socket.on("newAppointment",async (data) => {
  try{
    io.to(data.conversation_id).emit("newAppointment",data)
  }catch{
    socket.emit("errorMessage", { error: "Message could not be sent" });
  }
})
////////////////////////////////

    socket.on("sendDocNurMessage", async (data) => {
      try {
        console.log(data.sender_id, "sent a message:", data);

        
        // Validate
        if (!data.conversation_id || !data.sender_id || !data.receiver_id || !data.message) {
          return socket.emit("errorMessage", { error: "Invalid message data" });
        }
        
        // Save message to DB first so we get the generated _id and timestamp
        const Message = require("../models/messages-model");
        const {DocNurConversation} = require("../models/conversations-model");

        const savedMsg = await Message.create(data);

        await DocNurConversation.findOneAndUpdate(
          { conversation_id: data.conversation_id },
          {
            last_message: data.message,
            updated_at: Date.now(),
          }
        );

        // Emit to all users in the room with DB-generated _id and timestamp
        const emitData = { ...data, _id: savedMsg._id.toString(), timestamp: savedMsg.timestamp };
        io.to(data.conversation_id).emit("receiveDocNurMessage", emitData);


      } catch (err) {
        console.error("Error in sendMessage:", err);
        socket.emit("errorMessage", { error: "Message could not be sent" });
      }
    });
///////////////////////////////


    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

    // Real-time read receipts: when a user marks messages as read,
    // notify the conversation so the sender's UI can update instantly.
    socket.on("messagesRead", async (data) => {
      // data = { conversation_id, reader_id }
      if (data && data.conversation_id && data.reader_id) {
        try {
          // Update DB so read status persists across refreshes
          const Message = require("../models/messages-model");
          await Message.updateMany(
            { conversation_id: data.conversation_id, receiver_id: data.reader_id, read: false },
            { read: true }
          );
        } catch (err) {
          console.error("Error updating read status in DB:", err);
        }
        // Broadcast to all participants in the conversation room
        io.to(data.conversation_id).emit("messagesRead", data);
      }
    });
  });

};
