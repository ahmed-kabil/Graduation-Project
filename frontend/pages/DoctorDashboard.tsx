import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Doctor, Patient, DoctorPatientMessage } from '../types';
import { api } from '../services/mockApi';
import { DoctorAppointmentsView } from '../components/DoctorAppointmentsView';
import { PatientDetailView } from '../components/PatientDetailView';
import { appointmentService } from '../services/appointmentService';
import { useNotification } from '../context/NotificationContext';
import { useAlert } from '../context/AlertContext';
import { socketService, SocketMessage } from '../services/socketService';
import { chatService } from '../services/chatService';

// Icons
const PatientListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const AppointmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>;
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

    socketService.onMessage(handleIncomingMessage);

    // Cleanup on unmount
    return () => {
      socketService.offMessage(handleIncomingMessage);
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
      
      socketService.sendMessage(socketMessage);
      
      // Note: The message will be added to the UI when we receive it back via 'receiveMessage' event
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
    <div className="bg-white rounded-xl shadow-md flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 10rem)', minHeight: '400px' }}>
      <div className="flex-1 flex relative overflow-hidden">
        {/* Conversation List */}
        <div className={`absolute inset-0 sm:relative sm:inset-auto sm:w-1/3 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white z-10 transition-transform duration-300 ease-in-out ${selectedPatient ? '-translate-x-full sm:translate-x-0' : 'translate-x-0'}`}>
          <div className="p-4 border-b flex-shrink-0">
            <h3 className="text-xl font-semibold text-slate-800">Messages</h3>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {conversations.length > 0 ? conversations.map(convo => (
              <button key={convo.patient.id} onClick={() => handleSelectConversation(convo.patient)} className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 ${selectedPatient?.id === convo.patient.id ? 'bg-sky-50' : ''}`}>
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-800">{convo.patient.name}</p>
                  {convo.unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{convo.unreadCount}</span>}
                </div>
                <p className="text-sm text-slate-500 truncate">{convo.lastMessage.text}</p>
              </button>
            )) : <p className="p-4 text-slate-500">No conversations yet.</p>}
          </div>
        </div>
        {/* Chat View */}
        <div className={`absolute inset-0 sm:relative sm:inset-auto sm:w-2/3 flex-shrink-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${selectedPatient ? 'translate-x-0' : 'translate-x-full sm:translate-x-0'}`}>
          {selectedPatient ? (
            <>
              <div className="p-4 border-b flex items-center flex-shrink-0">
                <button onClick={() => setSelectedPatient(null)} className="sm:hidden mr-4 p-2 rounded-full hover:bg-slate-100">
                  &larr;
                </button>
                <h3 className="text-xl font-semibold text-slate-800 truncate">Chat with {selectedPatient.name}</h3>
              </div>
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === doctor.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-lg px-4 py-3 rounded-2xl ${msg.senderId === doctor.id ? 'bg-sky-500 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
                      <p className="break-words">{msg.text}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 sm:p-4 border-t bg-slate-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Type your message..." className="flex-1 min-w-0 px-4 py-2 border text-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500" disabled={isLoading}/>
                  <button onClick={handleSend} disabled={isLoading} className="flex-shrink-0 bg-sky-500 text-white p-3 rounded-full hover:bg-sky-600 disabled:bg-sky-300 transition"><SendIcon/></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 hidden sm:flex items-center justify-center text-slate-500 text-center p-4">
              <p>Select a conversation to start chatting</p>
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
    
    const doctor = user as Doctor;
    
    const doctorAlerts = alerts.filter(alert => doctor.patients.includes(alert.patientId));
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
                    `New appointment from ${data.patientName || 'a patient'}!`,
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
        { name: 'Alerts', icon: <div className="relative"><AlertIcon /><span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-opacity ${doctorUnreadCount > 0 ? 'opacity-100' : 'opacity-0'}`}>{doctorUnreadCount}</span></div>, onClick: () => { setActiveTab('Alerts'); setSelectedPatient(null); markAllRead(); } }
    ];

    const renderPatientList = () => (
        <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Assigned Patients</h3>
            <div className="space-y-3">
                {patients.map(p => (
                    <button key={p.id} onClick={() => setSelectedPatient(p)} className="w-full text-left p-4 rounded-lg bg-slate-50 hover:bg-sky-100 border border-slate-200 hover:border-sky-300 transition-transform duration-150 active:scale-[0.98] flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-slate-800">{p.name}, {p.age}</p>
                            <p className="text-sm text-slate-500">{p.gender}</p>
                        </div>
                        <span className="text-sm font-medium text-sky-600">View Details &rarr;</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderAlerts = () => (
        <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Critical Alerts ({doctorAlerts.length})</h3>
            <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {doctorAlerts.length === 0 ? <p className="text-slate-500">No active alerts for your patients.</p> :
                 doctorAlerts.map(a => (
                    <div key={a.id} className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start justify-between">
                        <div>
                            <p className="font-bold text-red-700">{a.message}</p>
                            <p className="text-sm text-red-600">Patient: {a.patientName} | Value: {a.value}</p>
                            <p className="text-xs text-slate-500 mt-1">{a.timestamp.toLocaleString()}</p>
                        </div>
                        <button onClick={() => dismissAlert(a.id)} className="ml-3 flex-shrink-0 p-1 rounded-full text-red-400 hover:text-red-700 hover:bg-red-100 transition" aria-label="Dismiss alert">
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
        if (activeTab === 'Alerts') return renderAlerts();

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