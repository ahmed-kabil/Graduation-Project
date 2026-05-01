// Socket Service - Real-time messaging with Socket.IO

import { io, Socket } from 'socket.io-client';

// Use relative URL (same origin) when VITE_BACKEND_URL is not set
// This allows the socket to connect through nginx proxy
const backendUrl = import.meta.env.VITE_BACKEND_URL !== undefined ? import.meta.env.VITE_BACKEND_URL : '';

// Types
export interface SocketMessage {
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  timestamp?: string;
  read?: boolean;
  _id?: string;
  // Extra fields for auto-creating conversations
  patient_name?: string;
  doctor_id?: string;
  patient_id?: string;
  nurse_id?: string;
  nurse_name?: string;
}

export interface SocketErrorMessage {
  error: string;
}

/**
 * Socket Service for real-time messaging
 */
export interface MessagesReadData {
  conversation_id: string;
  reader_id: string;
}

class SocketService {
  private socket: Socket | null = null;
  private docPatMessageHandlers: ((message: SocketMessage) => void)[] = [];
  private docNurMessageHandlers: ((message: SocketMessage) => void)[] = [];
  private messagesReadHandlers: ((data: MessagesReadData) => void)[] = [];
  private errorHandlers: ((error: SocketErrorMessage) => void)[] = [];
  private connectListeners: (() => void)[] = [];
  private joinedRooms: Set<string> = new Set();
  private onlineUserId: string | null = null;

  /**
   * Initialize socket connection
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    if (this.socket) {
      console.log('Socket exists but not connected, reconnecting...');
      this.socket.connect();
      return;
    }

    console.log('Creating new socket connection to:', backendUrl || 'same origin');
    
    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);

      // Re-establish online status
      if (this.onlineUserId && this.socket?.connected) {
        this.socket.emit('online', this.onlineUserId);
      }

      // Re-join all previously joined rooms (critical for reconnection)
      this.joinedRooms.forEach(room => {
        if (this.socket?.connected) {
          this.socket.emit('joinConversation', room);
        }
      });

      // Execute any pending connect listeners then clear them
      const pending = [...this.connectListeners];
      this.connectListeners = [];
      pending.forEach(listener => listener());
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('receiveDocPatMessage', (data: SocketMessage) => {
      console.log('Doc-Pat message received:', data);
      this.docPatMessageHandlers.forEach(handler => handler(data));
    });

    this.socket.on('receiveDocNurMessage', (data: SocketMessage) => {
      console.log('Doc-Nur message received:', data);
      this.docNurMessageHandlers.forEach(handler => handler(data));
    });

    this.socket.on('errorMessage', (data: SocketErrorMessage) => {
      console.error('Socket error:', data);
      this.errorHandlers.forEach(handler => handler(data));
    });

    this.socket.on('messagesRead', (data: MessagesReadData) => {
      console.log('📩 Messages read event received:', data);
      this.messagesReadHandlers.forEach(handler => handler(data));
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.docPatMessageHandlers = [];
      this.docNurMessageHandlers = [];
      this.messagesReadHandlers = [];
      this.errorHandlers = [];
      this.connectListeners = [];
      this.joinedRooms.clear();
      this.onlineUserId = null;
    }
  }

  /**
   * Execute callback when socket is connected (or immediately if already connected)
   */
  private whenConnected(callback: () => void): void {
    if (this.socket?.connected) {
      callback();
    } else {
      this.connectListeners.push(callback);
    }
  }

  /**
   * Emit "online" event to mark user as online
   */
  goOnline(userId: string): void {
    this.onlineUserId = userId;
    this.whenConnected(() => {
      if (this.socket?.connected) {
        this.socket.emit('online', userId);
        console.log('👤 User marked as online:', userId);
      }
    });
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    this.joinedRooms.add(conversationId);
    this.whenConnected(() => {
      if (this.socket?.connected) {
        this.socket.emit('joinConversation', conversationId);
        console.log('🚪 Joined conversation:', conversationId);
      }
    });
  }

  /**
   * Send a doctor-patient message through socket
   */
  sendDocPatMessage(data: SocketMessage): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected. Cannot send message.');
      return;
    }
    this.socket.emit('sendDocPatMessage', data);
    console.log('Doc-Pat message sent:', data);
  }

  /**
   * Send a doctor-nurse message through socket
   */
  sendDocNurMessage(data: SocketMessage): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected. Cannot send message.');
      return;
    }
    this.socket.emit('sendDocNurMessage', data);
    console.log('Doc-Nur message sent:', data);
  }

  /**
   * Emit a messagesRead event so the other party sees read receipts in real-time
   */
  emitMessagesRead(conversationId: string, readerId: string): void {
    this.whenConnected(() => {
      if (this.socket?.connected) {
        this.socket.emit('messagesRead', { conversation_id: conversationId, reader_id: readerId });
      }
    });
  }

  /**
   * Add a handler for messagesRead events
   */
  onMessagesRead(handler: (data: MessagesReadData) => void): void {
    this.messagesReadHandlers.push(handler);
  }

  /**
   * Remove a messagesRead handler
   */
  offMessagesRead(handler: (data: MessagesReadData) => void): void {
    this.messagesReadHandlers = this.messagesReadHandlers.filter(h => h !== handler);
  }

  /**
   * Add a handler for incoming doctor-patient messages
   */
  onDocPatMessage(handler: (message: SocketMessage) => void): void {
    this.docPatMessageHandlers.push(handler);
  }

  /**
   * Remove a doctor-patient message handler
   */
  offDocPatMessage(handler: (message: SocketMessage) => void): void {
    this.docPatMessageHandlers = this.docPatMessageHandlers.filter(h => h !== handler);
  }

  /**
   * Add a handler for incoming doctor-nurse messages
   */
  onDocNurMessage(handler: (message: SocketMessage) => void): void {
    this.docNurMessageHandlers.push(handler);
  }

  /**
   * Remove a doctor-nurse message handler
   */
  offDocNurMessage(handler: (message: SocketMessage) => void): void {
    this.docNurMessageHandlers = this.docNurMessageHandlers.filter(h => h !== handler);
  }

  /**
   * Add a handler for error messages
   */
  onError(handler: (error: SocketErrorMessage) => void): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Remove an error handler
   */
  offError(handler: (error: SocketErrorMessage) => void): void {
    this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
  }

  /**
   * Listen to a custom event
   */
  on(eventName: string, handler: (data: any) => void): void {
    if (!this.socket) {
      console.warn(`⚠️ Socket not initialized. Cannot listen to ${eventName}`);
      return;
    }
    this.socket.on(eventName, handler);
    console.log(`👂 Listening to event: ${eventName}`);
  }

  /**
   * Remove listener for a custom event
   */
  off(eventName: string, handler?: (data: any) => void): void {
    if (!this.socket) {
      return;
    }
    if (handler) {
      this.socket.off(eventName, handler);
    } else {
      this.socket.off(eventName);
    }
    console.log(`🔇 Stopped listening to event: ${eventName}`);
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket instance (for advanced use cases)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();
