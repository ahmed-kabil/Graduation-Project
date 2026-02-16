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
}

export interface SocketErrorMessage {
  error: string;
}

/**
 * Socket Service for real-time messaging
 */
class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: SocketMessage) => void)[] = [];
  private errorHandlers: ((error: SocketErrorMessage) => void)[] = [];
  private connectListeners: (() => void)[] = [];

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
      console.log('✅ Socket connected:', this.socket?.id);
      // Execute any pending connect listeners
      this.connectListeners.forEach(listener => listener());
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    this.socket.on('receiveMessage', (data: SocketMessage) => {
      console.log('📨 Message received:', data);
      this.messageHandlers.forEach(handler => handler(data));
    });

    this.socket.on('errorMessage', (data: SocketErrorMessage) => {
      console.error('❌ Socket error:', data);
      this.errorHandlers.forEach(handler => handler(data));
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.messageHandlers = [];
      this.errorHandlers = [];
      this.connectListeners = [];
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
    this.whenConnected(() => {
      if (this.socket?.connected) {
        this.socket.emit('joinConversation', conversationId);
        console.log('🚪 Joined conversation:', conversationId);
      }
    });
  }

  /**
   * Send a message through socket
   */
  sendMessage(data: SocketMessage): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket not connected. Cannot send message.');
      return;
    }
    this.socket.emit('sendMessage', data);
    console.log('📤 Message sent:', data);
  }

  /**
   * Add a handler for incoming messages
   */
  onMessage(handler: (message: SocketMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Remove a message handler
   */
  offMessage(handler: (message: SocketMessage) => void): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
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
