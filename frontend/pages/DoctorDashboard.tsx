import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Doctor, Patient, DoctorPatientMessage, Nurse } from '../types';
import { api } from '../services/mockApi';
import { DoctorAppointmentsView } from '../components/DoctorAppointmentsView';
import { PatientDetailView } from '../components/PatientDetailView';
import { appointmentService } from '../services/appointmentService';
import { useNotification } from '../context/NotificationContext';
import { useAlert } from '../context/AlertContext';
import { ProfilePage } from '../components/ProfilePage';
import { socketService, SocketMessage } from '../services/socketService';
import { chatService, DocNurConversation } from '../services/chatService';
import { getDateLabel, dateKey } from '../services/dateLabelUtils';

// Icons
const PatientListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const AppointmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>;
const NurseChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;

const MessagingView: React.FC<{ doctor: Doctor; initialPatientId?: string }> = ({ doctor, initialPatientId }) => {
  type ConversationSummary = { patient: Patient, lastMessage: DoctorPatientMessage, unreadCount: number };
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [messages, setMessages] = useState<DoctorPatientMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchConversations = useCallback(async () => {
    const convos = await api.getDoctorConversations(doctor.id);
    setConversations(convos);
  }, [doctor.id]);

  const fetchMessages = useCallback(async (patientId: string) => {
    const conversation = await api.getConversation(patientId, doctor.id);
    setMessages(conversation);
    await api.markMessagesAsRead(patientId, doctor.id);
    await fetchConversations(); 
  }, [doctor.id, fetchConversations]);

  // Initialize socket connection and event handlers
  useEffect(() => {
    // Connect to socket
    socketService.connect();
    
    // Mark doctor as online
    socketService.goOnline(doctor.id);

    // Join ALL patient conversations so we receive messages in real-time
    const joinAllConversations = async () => {
      try {
        const convos = await chatService.getDoctorConversations(doctor.id);
        convos.forEach(conv => {
          socketService.joinConversation(conv.conversation_id);
        });
      } catch (err) {
        console.error('Failed to join conversations:', err);
      }
    };
    joinAllConversations();

    // Handle incoming messages
    const handleIncomingMessage = (socketMsg: SocketMessage) => {
      console.log('Received message via socket:', socketMsg);
      
      // Convert socket message to DoctorPatientMessage format
      const newMessage: DoctorPatientMessage = {
        id: socketMsg._id || `msg-${Date.now()}`,
        senderId: socketMsg.sender_id,
        receiverId: socketMsg.receiver_id,
        text: socketMsg.message,
        timestamp: new Date(socketMsg.timestamp || new Date()),
        read: socketMsg.read || false,
      };

      // Update messages if this message is for the current conversation
      if (selectedPatient) {
        const patientId = selectedPatient.id;
        const isRelevantMessage = 
          (socketMsg.sender_id === patientId && socketMsg.receiver_id === doctor.id) ||
          (socketMsg.sender_id === doctor.id && socketMsg.receiver_id === patientId);
        
        if (isRelevantMessage) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });

          // Mark as read if message is from patient to doctor
          if (socketMsg.sender_id === patientId) {
            const conversationId = chatService.getConversationId(patientId);
            chatService.markMessagesAsRead({
              conversation_id: conversationId,
              user_id: doctor.id,
            });
          }
        }
      }

      // Refresh conversations to update last message and unread counts
      fetchConversations();
    };

    socketService.onDocPatMessage(handleIncomingMessage);

    // Cleanup on unmount
    return () => {
      socketService.offDocPatMessage(handleIncomingMessage);
    };
  }, [doctor.id, selectedPatient, fetchConversations]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-select patient if initialPatientId is provided
  useEffect(() => {
    if (initialPatientId && conversations.length > 0 && !selectedPatient) {
      const patient = conversations.find(c => c.patient.id === initialPatientId)?.patient;
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [initialPatientId, conversations, selectedPatient]);

  // Join conversation when patient is selected and fetch messages
  useEffect(() => {
    if (selectedPatient) {
      const conversationId = chatService.getConversationId(selectedPatient.id);
      socketService.joinConversation(conversationId);
      fetchMessages(selectedPatient.id);
    }
  }, [selectedPatient, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSelectConversation = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedPatient || isLoading) return;
    setIsLoading(true);
    
    const messageText = input.trim();
    setInput('');

    const conversationId = chatService.getConversationId(selectedPatient.id);
    
    try {
      // Send message via socket (which also saves to DB)
      const socketMessage: SocketMessage = {
        conversation_id: conversationId,
        sender_id: doctor.id,
        receiver_id: selectedPatient.id,
        message: messageText,
        patient_name: selectedPatient.name,
        doctor_id: doctor.id,
        patient_id: selectedPatient.id,
      };
      
      socketService.sendDocPatMessage(socketMessage);
      
      // Note: The message will be added to the UI when we receive it back via 'receiveDocPatMessage' event
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore input on error
      setInput(messageText);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mobile chat view uses absolute positioning for smooth slide transitions
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 10rem)', minHeight: '400px' }}>
      <div className="flex-1 flex relative overflow-hidden">
        {/* Conversation List */}
        <div className={`absolute inset-0 sm:relative sm:inset-auto sm:w-1/3 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800 z-10 transition-transform duration-300 ease-in-out ${selectedPatient ? '-translate-x-full sm:translate-x-0' : 'translate-x-0'}`}>
          <div className="p-4 border-b dark:border-slate-700 flex-shrink-0">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Messages</h3>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {conversations.length > 0 ? conversations.map(convo => (
              <button key={convo.patient.id} onClick={() => handleSelectConversation(convo.patient)} className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedPatient?.id === convo.patient.id ? 'bg-sky-50 dark:bg-sky-900/30' : ''}`}>
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-800 dark:text-white">{convo.patient.name}</p>
                  {convo.unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{convo.unreadCount}</span>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate" dir="auto">{convo.lastMessage.text}</p>
              </button>
            )) : <p className="p-4 text-slate-500 dark:text-slate-400">No conversations yet.</p>}
          </div>
        </div>
        {/* Chat View */}
        <div className={`absolute inset-0 sm:relative sm:inset-auto sm:w-2/3 flex-shrink-0 flex flex-col bg-white dark:bg-slate-800 transition-transform duration-300 ease-in-out ${selectedPatient ? 'translate-x-0' : 'translate-x-full sm:translate-x-0'}`}>
          {selectedPatient ? (
            <>
              <div className="p-4 border-b dark:border-slate-700 flex items-center flex-shrink-0">
                <button onClick={() => setSelectedPatient(null)} className="sm:hidden mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                  &larr;
                </button>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white truncate">Chat with {selectedPatient.name}</h3>
              </div>
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4">
                {messages.map((msg, idx) => {
                  const msgDate = new Date(msg.timestamp);
                  const currentKey = dateKey(msgDate);
                  const prevKey = idx > 0 ? dateKey(new Date(messages[idx - 1].timestamp)) : null;
                  const showSeparator = currentKey !== prevKey;
                  return (
                    <React.Fragment key={msg.id}>
                      {showSeparator && (
                        <div className="flex items-center justify-center my-3">
                          <span className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium px-3 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">{getDateLabel(msgDate)}</span>
                        </div>
                      )}
                      <div className={`flex items-end gap-2 ${msg.senderId === doctor.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] sm:max-w-lg px-4 py-3 rounded-2xl ${msg.senderId === doctor.id ? 'bg-sky-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white rounded-bl-none'}`}>
                          <p className="break-words" dir="auto">{msg.text}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p className="text-xs opacity-70">{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            {msg.senderId === doctor.id && (
                              <span className={`text-xs ${msg.read ? 'opacity-100' : 'opacity-60'}`} title={msg.read ? 'Read' : 'Sent'}>
                                {msg.read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 sm:p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Type your message..." dir="auto" className="flex-1 min-w-0 px-4 py-2 border dark:border-slate-600 dark:bg-slate-700 text-slate-800 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500" disabled={isLoading}/>
                  <button onClick={handleSend} disabled={isLoading} className="flex-shrink-0 bg-sky-500 text-white p-3 rounded-full hover:bg-sky-600 disabled:bg-sky-300 transition"><SendIcon/></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 hidden sm:flex items-center justify-center text-slate-500 dark:text-slate-400 text-center p-4">
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ------- Nurse Messaging View (Doctor ↔ Nurse) -------
const NurseMessagingView: React.FC<{ doctor: Doctor }> = ({ doctor }) => {
  type NurseConvoSummary = { conversation: DocNurConversation; messages: any[]; unreadCount: number };
  const [conversations, setConversations] = useState<NurseConvoSummary[]>([]);
  const [selectedNurseConvo, setSelectedNurseConvo] = useState<DocNurConversation | null>(null);
  const [messages, setMessages] = useState<DoctorPatientMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const convos = await chatService.getDoctorNurseConversations(doctor.id);
      const summaries: NurseConvoSummary[] = await Promise.all(
        convos.map(async (conv) => {
          const msgs = await chatService.getConversationMessages(conv.conversation_id);
          const unread = chatService.countUnreadMessages(msgs, doctor.id);
          return { conversation: conv, messages: msgs, unreadCount: unread };
        })
      );
      // Sort by most recent first
      summaries.sort((a, b) => new Date(b.conversation.updated_at).getTime() - new Date(a.conversation.updated_at).getTime());
      setConversations(summaries);
    } catch (err) {
      console.error('Failed to fetch nurse conversations:', err);
    }
  }, [doctor.id]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const msgs = await chatService.getConversationMessages(conversationId);
      setMessages(msgs.map(m => ({
        id: m._id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        text: m.message,
        timestamp: new Date(m.timestamp),
        read: m.read,
      })));
      // Mark as read
      await chatService.markMessagesAsRead({ conversation_id: conversationId, user_id: doctor.id });
      fetchConversations();
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [doctor.id, fetchConversations]);

  // Socket: connect, join conversations, listen for messages
  useEffect(() => {
    socketService.connect();
    socketService.goOnline(doctor.id);

    const joinAllNurseConvos = async () => {
      try {
        const convos = await chatService.getDoctorNurseConversations(doctor.id);
        convos.forEach(conv => socketService.joinConversation(conv.conversation_id));
      } catch (err) {
        console.error('Failed to join nurse conversations:', err);
      }
    };
    joinAllNurseConvos();

    const handleIncoming = (socketMsg: SocketMessage) => {
      const newMessage: DoctorPatientMessage = {
        id: socketMsg._id || `msg-${Date.now()}`,
        senderId: socketMsg.sender_id,
        receiverId: socketMsg.receiver_id,
        text: socketMsg.message,
        timestamp: new Date(socketMsg.timestamp || new Date()),
        read: socketMsg.read || false,
      };

      if (selectedNurseConvo) {
        const isRelevant = socketMsg.conversation_id === selectedNurseConvo.conversation_id;
        if (isRelevant) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage].sort((a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
          if (socketMsg.sender_id !== doctor.id) {
            chatService.markMessagesAsRead({
              conversation_id: selectedNurseConvo.conversation_id,
              user_id: doctor.id,
            });
          }
        }
      }
      fetchConversations();
    };

    socketService.onDocNurMessage(handleIncoming);
    return () => { socketService.offDocNurMessage(handleIncoming); };
  }, [doctor.id, selectedNurseConvo, fetchConversations]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (selectedNurseConvo) {
      socketService.joinConversation(selectedNurseConvo.conversation_id);
      fetchMessages(selectedNurseConvo.conversation_id);
    }
  }, [selectedNurseConvo, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedNurseConvo || isLoading) return;
    setIsLoading(true);
    const messageText = input.trim();
    setInput('');

    try {
      const socketMessage: SocketMessage = {
        conversation_id: selectedNurseConvo.conversation_id,
        sender_id: doctor.id,
        receiver_id: selectedNurseConvo.nurse_id,
        message: messageText,
        doctor_id: doctor.id,
        nurse_id: selectedNurseConvo.nurse_id,
        nurse_name: selectedNurseConvo.nurse_name,
      };
      socketService.sendDocNurMessage(socketMessage);
    } catch (error) {
      console.error('Error sending nurse message:', error);
      setInput(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 10rem)', minHeight: '400px' }}>
      <div className="flex-1 flex relative overflow-hidden">
        {/* Conversation List */}
        <div className={`absolute inset-0 sm:relative sm:inset-auto sm:w-1/3 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800 z-10 transition-transform duration-300 ease-in-out ${selectedNurseConvo ? '-translate-x-full sm:translate-x-0' : 'translate-x-0'}`}>
          <div className="p-4 border-b dark:border-slate-700 flex-shrink-0">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Nurse Messages</h3>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {conversations.length > 0 ? conversations.map(item => (
              <button key={item.conversation.conversation_id} onClick={() => setSelectedNurseConvo(item.conversation)} className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedNurseConvo?.conversation_id === item.conversation.conversation_id ? 'bg-sky-50 dark:bg-sky-900/30' : ''}`}>
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-800 dark:text-white">{item.conversation.nurse_name}</p>
                  {item.unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{item.unreadCount}</span>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate" dir="auto">{item.conversation.last_message || 'No messages yet'}</p>
              </button>
            )) : <p className="p-4 text-slate-500 dark:text-slate-400">No nurse conversations yet.</p>}
          </div>
        </div>
        {/* Chat View */}
        <div className={`absolute inset-0 sm:relative sm:inset-auto sm:w-2/3 flex-shrink-0 flex flex-col bg-white dark:bg-slate-800 transition-transform duration-300 ease-in-out ${selectedNurseConvo ? 'translate-x-0' : 'translate-x-full sm:translate-x-0'}`}>
          {selectedNurseConvo ? (
            <>
              <div className="p-4 border-b dark:border-slate-700 flex items-center flex-shrink-0">
                <button onClick={() => setSelectedNurseConvo(null)} className="sm:hidden mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">&larr;</button>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white truncate">Chat with Nurse {selectedNurseConvo.nurse_name}</h3>
              </div>
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4">
                {messages.map((msg, idx) => {
                  const msgDate = new Date(msg.timestamp);
                  const currentKey = dateKey(msgDate);
                  const prevKey = idx > 0 ? dateKey(new Date(messages[idx - 1].timestamp)) : null;
                  const showSeparator = currentKey !== prevKey;
                  return (
                    <React.Fragment key={msg.id}>
                      {showSeparator && (
                        <div className="flex items-center justify-center my-3">
                          <span className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium px-3 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">{getDateLabel(msgDate)}</span>
                        </div>
                      )}
                      <div className={`flex items-end gap-2 ${msg.senderId === doctor.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] sm:max-w-lg px-4 py-3 rounded-2xl ${msg.senderId === doctor.id ? 'bg-sky-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white rounded-bl-none'}`}>
                          <p className="break-words" dir="auto">{msg.text}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p className="text-xs opacity-70">{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            {msg.senderId === doctor.id && (
                              <span className={`text-xs ${msg.read ? 'opacity-100' : 'opacity-60'}`} title={msg.read ? 'Read' : 'Sent'}>
                                {msg.read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 sm:p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Type your message..." dir="auto" className="flex-1 min-w-0 px-4 py-2 border dark:border-slate-600 dark:bg-slate-700 text-slate-800 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500" disabled={isLoading} />
                  <button onClick={handleSend} disabled={isLoading} className="flex-shrink-0 bg-sky-500 text-white p-3 rounded-full hover:bg-sky-600 disabled:bg-sky-300 transition"><SendIcon /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 hidden sm:flex items-center justify-center text-slate-500 dark:text-slate-400 text-center p-4">
              <p>Select a nurse to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const DoctorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('Patients');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [conversations, setConversations] = useState<{patient: Patient, lastMessage: DoctorPatientMessage, unreadCount: number}[]>([]);
    const [newAppointmentCount, setNewAppointmentCount] = useState(0);
    const [autoSelectPatientId, setAutoSelectPatientId] = useState<string | undefined>(undefined);
    const { addToast } = useNotification();
    const { alerts, unreadCount, markAllRead, dismissAlert, isAlertRead } = useAlert();
    const notifiedMessagesRef = useRef<Set<string>>(new Set());
    const [dismissingAlertIds, setDismissingAlertIds] = useState<Set<string>>(new Set());
    
    const doctor = user as Doctor;
    
    // Filter alerts to only show alerts for patients assigned to this doctor.
    // Uses the live `patients` state (fetched via getDoctorPatients) for up-to-date filtering,
    // with a fallback to doctor.patients (set at login) for the initial render before patients load.
    const assignedPatientIds = patients.length > 0 ? patients.map(p => p.id) : doctor.patients;
    const doctorAlerts = alerts.filter(alert => assignedPatientIds.includes(alert.patientId));
    const doctorUnreadCount = doctorAlerts.filter(a => !isAlertRead(a.id)).length;

    // Real-time appointment notifications using Socket.io
    useEffect(() => {
        // Connect to socket
        socketService.connect();
        
        // Mark doctor as online so backend knows which socket to send notifications to
        socketService.goOnline(doctor.id);
        
        // Listen for new appointment events
        const handleNewAppointment = (data: any) => {
            console.log('📅 New appointment notification received:', data);
            
            // Only increment if not on Appointments tab
            if (activeTab !== 'Appointments') {
                setNewAppointmentCount(prev => prev + 1);
                addToast(
                    `New appointment request${data.patient_id ? ` (${data.date} at ${data.time})` : ''}!`,
                    'info',
                    () => {
                        setActiveTab('Appointments');
                        setSelectedPatient(null);
                        setNewAppointmentCount(0);
                    }
                );
            }
        };
        
        socketService.on('newAppointment', handleNewAppointment);
        
        // Cleanup
        return () => {
            socketService.off('newAppointment', handleNewAppointment);
        };
    }, [activeTab, addToast, doctor.id]);

    useEffect(() => {
        api.getDoctorPatients(doctor.id).then(fetchedPatients => {
            setPatients(fetchedPatients);
        });

        const fetchConvos = async () => {
            const convos = await api.getDoctorConversations(doctor.id);
            setConversations(convos);

            convos.forEach(convo => {
                if (convo.unreadCount > 0 && convo.lastMessage.senderId !== doctor.id && !notifiedMessagesRef.current.has(convo.lastMessage.id)) {
                    const shortMessage = convo.lastMessage.text.length > 40 ? `${convo.lastMessage.text.substring(0, 40)}...` : convo.lastMessage.text;
                    addToast(
                        `New message from ${convo.patient.name}: "${shortMessage}"`,
                        'info',
                        () => {
                            setActiveTab('Messages');
                            setAutoSelectPatientId(convo.patient.id);
                            setSelectedPatient(null);
                        }
                    );
                    notifiedMessagesRef.current.add(convo.lastMessage.id);
                }
            });
        };
        fetchConvos();
        const intervalId = setInterval(fetchConvos, 5000);
        return () => clearInterval(intervalId);
    }, [doctor.id, addToast]);

    const handleSelectPatientFromAppointment = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        if (patient) {
            setSelectedPatient(patient);
            setActiveTab('Patients');
        }
    };

    const totalUnread = conversations.reduce((sum, convo) => sum + convo.unreadCount, 0);

    const sidebarItems = [
        { name: 'Patients', icon: <PatientListIcon />, onClick: () => { setActiveTab('Patients'); setSelectedPatient(null); } },
        { name: 'Appointments', icon: <div className="relative"><AppointmentIcon /><span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition-opacity ${newAppointmentCount > 0 ? 'opacity-100' : 'opacity-0'}`}>{newAppointmentCount}</span></div>, onClick: () => { setActiveTab('Appointments'); setSelectedPatient(null); setNewAppointmentCount(0); } },
        { name: 'Messages', icon: <div className="relative"><MessageIcon /><span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-opacity ${totalUnread > 0 ? 'opacity-100' : 'opacity-0'}`}>{totalUnread}</span></div>, onClick: () => { setActiveTab('Messages'); setSelectedPatient(null); } },
        { name: 'Nurse Chat', icon: <NurseChatIcon />, onClick: () => { setActiveTab('Nurse Chat'); setSelectedPatient(null); } },
        { name: 'Alerts', icon: <div className="relative"><AlertIcon /><span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-opacity ${doctorUnreadCount > 0 ? 'opacity-100' : 'opacity-0'}`}>{doctorUnreadCount}</span></div>, onClick: () => { setActiveTab('Alerts'); setSelectedPatient(null); markAllRead(); } },
        { name: 'Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>, onClick: () => { setActiveTab('Profile'); setSelectedPatient(null); } }
    ];

    const renderPatientList = () => (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Assigned Patients</h3>
            <div className="space-y-3">
                {patients.map(p => (
                    <button key={p.id} onClick={() => setSelectedPatient(p)} className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-sky-100 dark:hover:bg-sky-900/30 border border-slate-200 dark:border-slate-700 hover:border-sky-300 transition-transform duration-150 active:scale-[0.98] flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-white">{p.name}, {p.age}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{p.gender}</p>
                        </div>
                        <span className="text-sm font-medium text-sky-600">View Details &rarr;</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const handleDismissAlert = (alertId: string) => {
        if (dismissingAlertIds.has(alertId)) return;
        setDismissingAlertIds(prev => new Set(prev).add(alertId));
        setTimeout(() => {
            dismissAlert(alertId);
            setDismissingAlertIds(prev => { const next = new Set(prev); next.delete(alertId); return next; });
        }, 280);
    };

    const renderAlerts = () => (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
            <style>{`
                @keyframes alert-fade-out {
                    from { opacity: 1; transform: translateX(0); }
                    to   { opacity: 0; transform: translateX(40px); }
                }
                .alert-dismissing { animation: alert-fade-out 280ms ease-in forwards; pointer-events: none; }
            `}</style>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Critical Alerts ({doctorAlerts.length})</h3>
            <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {doctorAlerts.length === 0 ? <p className="text-slate-500 dark:text-slate-400">No active alerts for your patients.</p> :
                 doctorAlerts.map(a => (
                    <div key={a.id} className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-start justify-between transition-all ${dismissingAlertIds.has(a.id) ? 'alert-dismissing' : ''}`}>
                        <div>
                            <p className="font-bold text-red-700 dark:text-red-400">{a.message}</p>
                            <p className="text-sm text-red-600 dark:text-red-400">Patient: {a.patientName} | Value: {a.value}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{a.timestamp.toLocaleString()}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDismissAlert(a.id); }} className="ml-3 flex-shrink-0 p-1 rounded-full text-red-400 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition" aria-label="Dismiss alert">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderContent = () => {
        if (activeTab === 'Appointments') return <DoctorAppointmentsView doctor={doctor} onSelectPatient={handleSelectPatientFromAppointment} />;
        if (activeTab === 'Messages') return <MessagingView doctor={doctor} initialPatientId={autoSelectPatientId} />;
        if (activeTab === 'Nurse Chat') return <NurseMessagingView doctor={doctor} />;
        if (activeTab === 'Alerts') return renderAlerts();
        if (activeTab === 'Profile') return <ProfilePage />;

        if (selectedPatient) {
            return <PatientDetailView patient={selectedPatient} onBack={() => setSelectedPatient(null)} />;
        }
        return renderPatientList();
    };

    return (
        <Layout sidebarItems={sidebarItems} activeItem={selectedPatient ? 'Patients' : activeTab}>
            {renderContent()}
        </Layout>
    );
};