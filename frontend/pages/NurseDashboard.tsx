

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Nurse, Patient, DoctorPatientMessage } from '../types';
import { api } from '../services/mockApi';
import { PatientDetailView } from '../components/PatientDetailView';
import { useAlert } from '../context/AlertContext';
import { useNotification } from '../context/NotificationContext';
import { ProfilePage } from '../components/ProfilePage';
import { socketService, SocketMessage } from '../services/socketService';
import { chatService, DocNurConversation } from '../services/chatService';
import { getDateLabel, dateKey } from '../services/dateLabelUtils';

// Icons
const PatientListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;

// ------- Doctor Messaging View (Nurse ↔ Doctor) -------
const DoctorMessagingView: React.FC<{ nurse: Nurse }> = ({ nurse }) => {
  type DocConvoSummary = { conversation: DocNurConversation; messages: any[]; unreadCount: number };
  const [conversations, setConversations] = useState<DocConvoSummary[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<DocNurConversation | null>(null);
  const selectedConvoRef = useRef<DocNurConversation | null>(null);
  const [messages, setMessages] = useState<DoctorPatientMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Keep ref in sync so socket handlers always read the latest selected conversation
  useEffect(() => { selectedConvoRef.current = selectedConvo; }, [selectedConvo]);

  const fetchConversations = useCallback(async () => {
    try {
      const convos = await chatService.getNurseConversations(nurse.id);
      const summaries: DocConvoSummary[] = await Promise.all(
        convos.map(async (conv) => {
          const msgs = await chatService.getConversationMessages(conv.conversation_id);
          const unread = chatService.countUnreadMessages(msgs, nurse.id);
          return { conversation: conv, messages: msgs, unreadCount: unread };
        })
      );
      summaries.sort((a, b) => new Date(b.conversation.updated_at).getTime() - new Date(a.conversation.updated_at).getTime());
      setConversations(summaries);
    } catch (err) {
      console.error('Failed to fetch doctor conversations:', err);
    }
  }, [nurse.id]);

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
      await chatService.markMessagesAsRead({ conversation_id: conversationId, user_id: nurse.id });
      // Emit read receipt so the doctor sees ✓✓ instantly
      socketService.emitMessagesRead(conversationId, nurse.id);
      fetchConversations();
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [nurse.id, fetchConversations]);

  // Socket: connect, join all nurse conversations, listen for messages
  useEffect(() => {
    socketService.connect();
    socketService.goOnline(nurse.id);

    const joinAllDocConvos = async () => {
      try {
        const convos = await chatService.getNurseConversations(nurse.id);
        convos.forEach(conv => socketService.joinConversation(conv.conversation_id));
      } catch (err) {
        console.error('Failed to join doctor conversations:', err);
      }
    };
    joinAllDocConvos();

    // Handle incoming messages — reads selectedConvo from ref to avoid stale closures
    const handleIncoming = (socketMsg: SocketMessage) => {
      const newMessage: DoctorPatientMessage = {
        id: socketMsg._id || `msg-${Date.now()}`,
        senderId: socketMsg.sender_id,
        receiverId: socketMsg.receiver_id,
        text: socketMsg.message,
        timestamp: new Date(socketMsg.timestamp || new Date()),
        read: socketMsg.read || false,
      };

      const convo = selectedConvoRef.current;
      if (convo) {
        const isRelevant = socketMsg.conversation_id === convo.conversation_id;
        if (isRelevant) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage].sort((a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
          if (socketMsg.sender_id !== nurse.id) {
            chatService.markMessagesAsRead({
              conversation_id: convo.conversation_id,
              user_id: nurse.id,
            });
            socketService.emitMessagesRead(convo.conversation_id, nurse.id);
          }
        }
      }
      fetchConversations();
    };

    // Listen for read receipts from doctor — uses ref for latest selectedConvo
    const handleDocRead = (data: { conversation_id: string; reader_id: string }) => {
      const convo = selectedConvoRef.current;
      if (convo && data.reader_id !== nurse.id && data.conversation_id === convo.conversation_id) {
        setMessages(prev => prev.map(m =>
          m.senderId === nurse.id && !m.read ? { ...m, read: true } : m
        ));
      }
    };

    socketService.onDocNurMessage(handleIncoming);
    socketService.onMessagesRead(handleDocRead);
    return () => { socketService.offDocNurMessage(handleIncoming); socketService.offMessagesRead(handleDocRead); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nurse.id, fetchConversations]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (selectedConvo) {
      socketService.joinConversation(selectedConvo.conversation_id);
      fetchMessages(selectedConvo.conversation_id);
    }
  }, [selectedConvo, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedConvo || isLoading) return;
    setIsLoading(true);
    const messageText = input.trim();
    setInput('');

    try {
      const socketMessage: SocketMessage = {
        conversation_id: selectedConvo.conversation_id,
        sender_id: nurse.id,
        receiver_id: selectedConvo.doctor_id,
        message: messageText,
        doctor_id: selectedConvo.doctor_id,
        nurse_id: nurse.id,
        nurse_name: selectedConvo.nurse_name,
      };
      socketService.sendDocNurMessage(socketMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      setInput(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 10rem)', minHeight: '400px' }}>
      <div className="flex-1 flex relative overflow-hidden">
        {/* Conversation List */}
        <div className={`absolute inset-0 sm:relative sm:inset-auto sm:w-1/3 flex-shrink-0 border-r border-slate-100 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800 z-10 transition-transform duration-300 ease-in-out ${selectedConvo ? '-translate-x-full sm:translate-x-0' : 'translate-x-0'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Doctor Messages</h3>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
            {conversations.length > 0 ? conversations.map(item => (
              <div key={item.conversation.conversation_id} className={`flex items-center border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${selectedConvo?.conversation_id === item.conversation.conversation_id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                <button onClick={() => setSelectedConvo(item.conversation)} className="flex-1 text-left p-4 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm text-slate-800 dark:text-white">Dr. {item.conversation.doctor_name}</p>
                    {item.unreadCount > 0 && <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{item.unreadCount}</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate" dir="auto">{item.conversation.last_message || 'No messages yet'}</p>
                </button>
              </div>
            )) : <p className="p-4 text-sm text-slate-500 dark:text-slate-400">No doctor conversations yet.</p>}
          </div>
        </div>
        {/* Chat View */}
        <div className={`absolute inset-0 sm:relative sm:inset-auto sm:w-2/3 flex-shrink-0 flex flex-col bg-white dark:bg-slate-800 transition-transform duration-300 ease-in-out ${selectedConvo ? 'translate-x-0' : 'translate-x-full sm:translate-x-0'}`}>
          {selectedConvo ? (
            <>
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center flex-shrink-0">
                <button onClick={() => setSelectedConvo(null)} className="sm:hidden mr-4 p-2 rounded-xl text-xl text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">&larr;</button>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white truncate">Chat with Dr. {selectedConvo.doctor_name}</h3>
              </div>
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 custom-scrollbar">
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
                      <div className={`flex items-end gap-2 ${msg.senderId === nurse.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] sm:max-w-lg px-4 py-3 rounded-2xl ${msg.senderId === nurse.id ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-bl-none'}`}>
                          <div className="break-words" dir="auto" style={{ unicodeBidi: 'plaintext', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p className="text-xs opacity-70">{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            {msg.senderId === nurse.id && (
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
              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Type your message..." dir="auto" className="flex-1 min-w-0 px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40" disabled={isLoading} />
                  <button onClick={handleSend} disabled={isLoading} className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 transition-all"><SendIcon /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 hidden sm:flex items-center justify-center text-slate-500 dark:text-slate-400 text-center p-4">
              <p>Select a doctor to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const NurseDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('Patients');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const { alerts, unreadCount, markAllRead, dismissAlert } = useAlert();
    const { addToast } = useNotification();
    const [dismissingAlertIds, setDismissingAlertIds] = useState<Set<string>>(new Set());
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const notifiedMessagesRef = useRef<Set<string>>(new Set());
    
    const nurse = user as Nurse;

    useEffect(() => {
        api.getAllPatients().then(setPatients);
    }, []);

    // Poll for unread message badge count
    useEffect(() => {
        const fetchDoctorMessages = async () => {
            try {
                const convos = await chatService.getNurseConversations(nurse.id);
                let totalUnread = 0;
                for (const conv of convos) {
                    const msgs = await chatService.getConversationMessages(conv.conversation_id);
                    const unreadMsgs = msgs.filter(m => m.receiver_id === nurse.id && !m.read);
                    totalUnread += unreadMsgs.length;
                }
                setUnreadMessageCount(totalUnread);
            } catch (err) {
                console.error('Failed to poll doctor messages:', err);
            }
        };
        fetchDoctorMessages();
        const intervalId = setInterval(fetchDoctorMessages, 5000);
        return () => clearInterval(intervalId);
    }, [nurse.id]);

    // Socket-driven instant toast for incoming doctor messages
    useEffect(() => {
        socketService.connect();
        socketService.goOnline(nurse.id);

        // Join ALL conversation rooms so toast handlers receive events
        const joinAllRooms = async () => {
            try {
                const convos = await chatService.getNurseConversations(nurse.id);
                convos.forEach(conv => socketService.joinConversation(conv.conversation_id));
            } catch (err) {
                console.error('Failed to join conversation rooms:', err);
            }
        };
        joinAllRooms();

        const handleDoctorMsgToast = (msg: any) => {
            if (msg.receiver_id !== nurse.id || msg.sender_id === nurse.id) return;
            const msgId = msg._id || `msg-${Date.now()}-${Math.random()}`;
            if (notifiedMessagesRef.current.has(msgId)) return;
            notifiedMessagesRef.current.add(msgId);
            const shortMessage = msg.message && msg.message.length > 40 ? `${msg.message.substring(0, 40)}...` : (msg.message || '');
            const senderName = msg.doctor_name || msg.sender_name || 'Doctor';
            addToast(
                `New message from Dr. ${senderName}: "${shortMessage}"`,
                'info',
                () => {
                    setActiveTab('Messages');
                    setSelectedPatient(null);
                }
            );
        };

        socketService.onDocNurMessage(handleDoctorMsgToast);

        return () => {
            socketService.offDocNurMessage(handleDoctorMsgToast);
        };
    }, [nurse.id, addToast]);
    
    const sidebarItems = [
        { name: 'Patients', icon: <PatientListIcon />, onClick: () => { setActiveTab('Patients'); setSelectedPatient(null); } },
        { name: 'Messages', icon: <div className="relative"><MessageIcon /><span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-opacity ${unreadMessageCount > 0 ? 'opacity-100' : 'opacity-0'}`}>{unreadMessageCount}</span></div>, onClick: () => { setActiveTab('Messages'); setSelectedPatient(null); } },
        { name: 'Alerts', icon: <div className="relative"><AlertIcon /><span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-opacity ${unreadCount > 0 ? 'opacity-100' : 'opacity-0'}`}>{unreadCount}</span></div>, onClick: () => { setActiveTab('Alerts'); setSelectedPatient(null); markAllRead(); } },
        { name: 'Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>, onClick: () => { setActiveTab('Profile'); setSelectedPatient(null); } }
    ];

    const renderPatientList = () => (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">All Hospital Patients</h3>
            <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto custom-scrollbar">
                {patients.map(p => (
                    <button key={p.id} onClick={() => setSelectedPatient(p)} className="w-full text-left p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-all duration-150 active:scale-[0.98] flex justify-between items-center">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white">{p.name}, {p.age}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{p.gender}</p>
                        </div>
                        <span className="text-sm font-medium text-blue-600">Monitor Vitals &rarr;</span>
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-6">
            <style>{`
                @keyframes alert-fade-out {
                    from { opacity: 1; transform: translateX(0); }
                    to   { opacity: 0; transform: translateX(40px); }
                }
                .alert-dismissing { animation: alert-fade-out 280ms ease-in forwards; pointer-events: none; }
            `}</style>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Critical Alerts ({alerts.length})</h3>
            <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto custom-scrollbar">
                {alerts.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No active alerts.</p> :
                 alerts.map(a => (
                    <div key={a.id} className={`p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 flex items-start justify-between transition-all ${dismissingAlertIds.has(a.id) ? 'alert-dismissing' : ''}`}>
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
        if (activeTab === 'Messages') return <DoctorMessagingView nurse={nurse} />;
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