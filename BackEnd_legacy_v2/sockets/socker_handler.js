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
        
        // Emit to all users in the room
        io.to(data.conversation_id).emit("receiveDocPatMessage", data);
        
        // Save message to DB
        const Message = require("../models/messages-model");
        const {DocPatConversation} = require("../models/conversations-model");

        await Message.create(data);

        await DocPatConversation.findOneAndUpdate(
          { conversation_id: data.conversation_id },
          {
            last_message: data.message,
            updated_at: Date.now(),
          }
        );


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
        
        // Emit to all users in the room
        io.to(data.conversation_id).emit("receiveDocNurMessage", data);
        
        // Save message to DB
        const Message = require("../models/messages-model");
        const {DocNurConversation} = require("../models/conversations-model");

        await Message.create(data);

        await DocNurConversation.findOneAndUpdate(
          { conversation_id: data.conversation_id },
          {
            last_message: data.message,
            updated_at: Date.now(),
          }
        );


      } catch (err) {
        console.error("Error in sendMessage:", err);
        socket.emit("errorMessage", { error: "Message could not be sent" });
      }
    });
///////////////////////////////


    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);


    });
  });

};
