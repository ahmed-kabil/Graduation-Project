// Chat Service - Backend API Integration for messaging functionality

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const BASE_URL = backendUrl !== undefined ? `${backendUrl}/api` : '/api';

/**
 * Helper function to make authenticated API requests
 */
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
};

// Types
export interface Message {
  _id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  timestamp: string;
  __v?: number;
}

export interface Conversation {
  _id: string;
  conversation_id: string;
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  last_message: string;
  updated_at: string;
  __v?: number;
}

export interface SendMessageData {
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
}

export interface MarkAsReadData {
  conversation_id: string;
  user_id: string;
}

/**
 * Chat Service API
 */
export const chatService = {
  /**
   * Get all conversations for a doctor
   * GET /api/conversations/{doc_id}
   */
  getDoctorConversations: async (doctorId: string): Promise<Conversation[]> => {
    const response = await apiRequest(`/conversations/${doctorId}`);
    return response.data.docConversations || [];
  },

  /**
   * Get all messages for a specific conversation
   * GET /api/messages/{conversation_id}
   */
  getConversationMessages: async (conversationId: string): Promise<Message[]> => {
    const response = await apiRequest(`/messages/${conversationId}`);
    return response.data.messages || [];
  },

  /**
   * Send a message in a conversation
   * POST /api/messages/send
   */
  sendMessage: async (data: SendMessageData): Promise<Message> => {
    const response = await apiRequest('/messages/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Mark messages as read in a conversation
   * POST /api/messages/read
   */
  markMessagesAsRead: async (data: MarkAsReadData): Promise<void> => {
    await apiRequest('/messages/read', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Helper function to get conversation ID for a patient
   */
  getConversationId: (patientId: string): string => {
    return `conv_${patientId}`;
  },

  /**
   * Count unread messages for a specific conversation and user
   */
  countUnreadMessages: (messages: Message[], userId: string): number => {
    return messages.filter(msg => msg.receiver_id === userId && !msg.read).length;
  },
};
