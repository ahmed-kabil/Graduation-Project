# Chat Functionality Refactoring - Backend Integration

## Overview

The chat functionality in the React frontend has been successfully refactored to communicate with the backend APIs instead of using localStorage. This ensures that messages are persisted in the database and accessible across devices.

## Changes Made

### 1. New Services Created

#### **chatService.ts** (`frontend/services/chatService.ts`)
- Handles all chat-related API calls to the backend
- Provides methods for:
  - Getting doctor's conversations
  - Fetching conversation messages
  - Sending messages
  - Marking messages as read
  - Helper utilities for conversation management

#### **socketService.ts** (`frontend/services/socketService.ts`)
- Manages Socket.IO connection for real-time messaging
- Provides methods for:
  - Connecting/disconnecting from the socket server
  - Marking user as online
  - Joining conversation rooms
  - Sending/receiving messages in real-time
  - Error handling for socket events

### 2. Updated Components

#### **DoctorDashboard.tsx** (`frontend/pages/DoctorDashboard.tsx`)
- **MessagingView Component**: 
  - Replaced polling-based message fetching with Socket.IO event listeners
  - Messages now update in real-time when received
  - Automatically marks messages as read when viewing a conversation
  - Sends messages via Socket.IO (which also saves to database)

#### **PatientDashboard.tsx** (`frontend/pages/PatientDashboard.tsx`)
- **DoctorChatModal Component**:
  - Integrated Socket.IO for real-time messaging with assigned doctor
  - Replaced localStorage-based messaging with backend APIs
  - Automatically connects to socket and joins conversation when modal opens
  - Real-time message updates without polling

#### **mockApi.ts** (`frontend/services/mockApi.ts`)
- Removed localStorage-based chat implementations
- Updated to use the new `chatService` for all chat operations
- Added helper method `_convertMessage` to transform backend message format to frontend format

### 3. Dependencies Added

- **socket.io-client**: For real-time bidirectional communication with the backend

### 4. Type Definitions

- **vite-env.d.ts**: Created to provide TypeScript support for Vite environment variables

## How It Works

### Backend API Endpoints Used

1. **GET /api/conversations/{doc_id}**: Fetch all conversations for a doctor
2. **GET /api/messages/{conversation_id}**: Fetch all messages in a conversation
3. **POST /api/messages/send**: Send a new message
4. **POST /api/messages/read**: Mark messages as read

### Socket.IO Events

#### Emitted by Frontend:
1. **online**: Mark user as online when connecting
   ```javascript
   socket.emit("online", user_id)
   ```

2. **joinConversation**: Join a conversation room
   ```javascript
   socket.emit("joinConversation", conversation_id)
   ```

3. **sendMessage**: Send a message (also saves to database)
   ```javascript
   socket.emit("sendMessage", {
     conversation_id: "conv_pat001",
     sender_id: "doc001",
     receiver_id: "pat001",
     message: "Hello!"
   })
   ```

#### Received by Frontend:
1. **receiveMessage**: Receive a new message from the server
   ```javascript
   socket.on("receiveMessage", (data) => {
     // Handle incoming message
   })
   ```

2. **errorMessage**: Handle error messages
   ```javascript
   socket.on("errorMessage", (error) => {
     // Handle error
   })
   ```

### Conversation ID Format

- Conversations are identified by: `conv_{patient_id}`
- Example: For patient `pat001`, the conversation ID is `conv_pat001`
- This format is automatically generated when a new patient is added to the system

## Configuration

### Environment Variables

Set the backend URL in your `.env` file:

```env
# For development
VITE_BACKEND_URL=http://localhost:8080

# For production (relative URLs, same origin)
VITE_BACKEND_URL=
```

If `VITE_BACKEND_URL` is not set, the frontend defaults to using relative URLs (`/api`).

## Usage

### Doctor Dashboard

1. Navigate to the "Messages" tab
2. Click on a conversation from the list to open the chat
3. Type your message and press Enter or click the Send button
4. Messages appear in real-time without page refresh
5. Unread message counts update automatically

### Patient Dashboard

1. Navigate to the "Doctor" tab
2. Click the "Contact Doctor" button
3. Chat modal opens with your assigned doctor
4. Type your message and press Enter or click the Send button
5. Messages appear in real-time

## Benefits of the Refactoring

1. **Persistent Data**: Messages are stored in the database, accessible from any device
2. **Real-Time Communication**: Instant message delivery using Socket.IO
3. **Better User Experience**: No polling delays, messages appear immediately
4. **Scalability**: Backend handles message storage and delivery
5. **Cross-Device Sync**: Messages sync across all devices logged in with the same account
6. **Offline Message Delivery**: Messages sent while a user is offline will be delivered when they come online

## Testing

To test the new chat functionality:

1. Start the backend server (ensure Socket.IO is properly configured)
2. Start the frontend development server: `npm run dev`
3. Open two browser windows:
   - One logged in as a doctor
   - One logged in as a patient (assigned to that doctor)
4. Send messages from either side and verify they appear in real-time
5. Close and reopen the chat to verify messages persist

## Troubleshooting

### Messages not appearing in real-time

- Check that the backend Socket.IO server is running
- Verify the `VITE_BACKEND_URL` environment variable is set correctly
- Check browser console for Socket.IO connection errors

### "Cannot find module 'socket.io-client'" error

- Run `npm install` in the frontend directory to install dependencies

### Import.meta.env TypeScript errors

- Ensure `vite-env.d.ts` exists in the frontend root directory
- Restart your TypeScript server in VSCode

## Future Enhancements

- Add typing indicators to show when the other person is typing
- Add message delivery status (sent, delivered, read)
- Add support for multimedia messages (images, files)
- Add message search functionality
- Add conversation archiving
- Add group conversations for multi-doctor consultations
