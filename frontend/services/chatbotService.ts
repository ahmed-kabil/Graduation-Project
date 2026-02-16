// Medical ChatBot Service - Backend API Integration
// Replaces the legacy Gemini client-side implementation with server-side RAG-based chatbot

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const CHATBOT_API_URL = backendUrl !== undefined ? `${backendUrl}/api/chatbot` : '/api/chatbot';

export const getChatbotResponse = async (message: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('msg', message);

    const response = await fetch(CHATBOT_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Error fetching chatbot response:", error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
};
