import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Patient, Doctor, ChatMessage, VitalSign, VitalHistoryPoint, DoctorPatientMessage } from '../types';
import { api } from '../services/mockApi';
import { getChatbotResponse } from '../services/chatbotService';
import { useVitals } from '../hooks/useVitals';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { AppointmentScheduler } from '../components/AppointmentScheduler';
import { useNotification } from '../context/NotificationContext';
import { socketService, SocketMessage } from '../services/socketService';
import { chatService } from '../services/chatService';
import { ProfilePage } from '../components/ProfilePage';
import { getDateLabel, dateKey } from '../services/dateLabelUtils';

// Icons
const VitalsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
const ChatbotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const DoctorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.52 19c.64-2.2 1.84-3 3.22-3h6.52c1.38 0 2.58.8 3.22 3"/><circle cx="12" cy="10" r="3"/><circle cx="12" cy="12" r="10"/></svg>;
const AppointmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-rose-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const TempIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-amber-500 animate-pulse"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></svg>;
const RespirationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-blue-500 animate-pulse"><path d="M3 12h6l3-9 3 18 3-9h6"/></svg>;
const O2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-emerald-500 animate-pulse"><path d="M12.25 21.16a10.05 10.05 0 0 1-5.18-1.74 2.43 2.43 0 0 1-1.33-2.18l-1.2-6.52a2.43 2.43 0 0 1 .53-2.17 10.05 10.05 0 0 1 14.86 6.31 2.43 2.43 0 0 1-2.17 2.72l-6.52 1.2a2.43 2.43 0 0 1-.99.28z"/><path d="M22 2S15 2 12 5"/><path d="M2 22s7 0 10-3"/></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

const VitalsCard: React.FC<{ vital: VitalSign }> = ({ vital }) => {
    const icons = {
        'Heart Rate': <HeartIcon/>,
        'Temperature': <TempIcon/>,
        'Respiration Rate': <RespirationIcon/>,
        'SpO2': <O2Icon/>,
    }
    const isOutOfRange = vital.thresholds && (vital.value < vital.thresholds.min || vital.value > vital.thresholds.max);
    return (
        <div className={`bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-card card-hover border ${isOutOfRange ? 'border-red-200 dark:border-red-800/50' : 'border-slate-100 dark:border-slate-700/50'}`}>
            <div className="flex items-center justify-between mb-3">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{vital.name}</p>
                <div className="opacity-80">{icons[vital.name]}</div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{vital.value} <span className="text-base font-normal text-slate-400 dark:text-slate-500">{vital.unit}</span></p>
        </div>
    )
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length > 0) {
    // Get the actual data point from the payload
    const dataPoint = payload[0].payload;
    
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
        <p className="label text-sm font-bold text-slate-800 dark:text-white mb-1">{`Time: ${dataPoint.time || label}`}</p>
        <p style={{ color: '#ef4444' }} className="text-sm font-medium">
          {`Heart Rate: ${dataPoint.heartRate?.toFixed(1) || '0.0'} BPM`}
        </p>
        <p style={{ color: '#f59e0b' }} className="text-sm font-medium">
          {`Temperature: ${dataPoint.temperature?.toFixed(1) || '0.0'} °C`}
        </p>
        <p style={{ color: '#3b82f6' }} className="text-sm font-medium">
          {`Respiration Rate: ${dataPoint.respirationRate?.toFixed(1) || '0.0'} breaths/min`}
        </p>
        <p style={{ color: '#10b981' }} className="text-sm font-medium">
          {`SpO2: ${dataPoint.spo2?.toFixed(1) || '0.0'} %`}
        </p>
      </div>
    );
  }
  return null;
};


const VitalsDisplay: React.FC<{patient: Patient}> = ({ patient }) => {
    // FIX: Removed incorrect second argument from useVitals call.
    const { vitals, history } = useVitals(patient);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const chartData: Record<VitalSign['name'], VitalHistoryPoint[]> = history;
    
    // Merge all vitals data by time for synchronized tooltip display
    const mergedChartData = chartData['Heart Rate']?.map((point, index) => ({
        time: point.time,
        heartRate: chartData['Heart Rate'][index]?.value || 0,
        temperature: chartData['Temperature'][index]?.value || 0,
        respirationRate: chartData['Respiration Rate'][index]?.value || 0,
        spo2: chartData['SpO2'][index]?.value || 0,
    })) || [];
    
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const healthStatus = vitals.every(v => v.thresholds && v.value >= v.thresholds.min && v.value <= v.thresholds.max)
        ? "All your vitals are looking great!"
        : "Some of your vitals are outside the normal range. Your doctor has been notified.";
    const statusColor = healthStatus.includes("great") ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';

    return (
        <div className="space-y-6">
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{getGreeting()}, {patient.name.split(' ')[0]}!</h2>
                <div className={`mt-3 p-4 rounded-xl flex items-center text-sm font-medium border ${statusColor}`}>
                    <CheckCircleIcon />
                    <p>{healthStatus}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {vitals.map(v => <VitalsCard key={v.name} vital={v}/>)}
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Vitals History (Last 20 Readings)</h3>
                <ResponsiveContainer width="100%" height={350}>
                     <AreaChart data={mergedChartData} margin={isMobile ? { top: 5, right: 5, left: -25, bottom: 0 } : { top: 5, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorHeartRate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorTemperature" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRespirationRate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorSpO2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="stroke-slate-300" vertical={false}/>
                        <XAxis 
                            dataKey="time" 
                            stroke="#64748b"
                            tick={{ fontSize: isMobile ? 10 : 12, fill: 'currentColor' }} 
                            className="text-slate-600 dark:text-slate-400"
                            tickLine={false}
                            interval={isMobile ? 'preserveEnd' : 'preserveStartEnd'}
                        />
                        <YAxis yAxisId="left" stroke="#64748b" domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" domain={[90, 100]} tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} animationDuration={200} isAnimationActive={false} />
                        {!isMobile && <Legend wrapperStyle={{ color: 'var(--text-color)' }} />}
                        <Area yAxisId="left" type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#ef4444" fillOpacity={1} fill="url(#colorHeartRate)" strokeWidth={2} activeDot={{ r: 6 }} dot={false} connectNulls />
                        <Area yAxisId="left" type="monotone" dataKey="temperature" name="Temperature" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTemperature)" strokeWidth={2} activeDot={{ r: 6 }} dot={false} connectNulls />
                        <Area yAxisId="left" type="monotone" dataKey="respirationRate" name="Respiration Rate" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRespirationRate)" strokeWidth={2} activeDot={{ r: 6 }} dot={false} connectNulls />
                        <Area yAxisId="right" type="monotone" dataKey="spo2" name="SpO2" stroke="#10b981" fillOpacity={1} fill="url(#colorSpO2)" strokeWidth={2} activeDot={{ r: 6 }} dot={false} connectNulls />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const TypingIndicator = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
    </div>
);

const Chatbot: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    useEffect(() => {
        setMessages([{
            id: 'welcome',
            text: "Hello! I'm your hospital assistant. How can I help you today?",
            sender: 'bot',
            timestamp: new Date()
        }])
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMessage: ChatMessage = { id: `user-${Date.now()}`, text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const botResponseText = await getChatbotResponse(input);
        
        const botMessage: ChatMessage = { id: `bot-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)] flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Chat with Assistant</h3>
            </div>
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">AI</div>}
                        <div className={`max-w-lg px-4 py-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-bl-none'}`}>
                            <div dir="auto" style={{ unicodeBidi: 'plaintext', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
                        </div>
                    </div>
                ))}
                {isLoading && <div className="flex justify-start"><div className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-3 rounded-2xl rounded-bl-none"><TypingIndicator/></div></div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 rounded-b-2xl">
                <div className="flex items-center gap-2">
                    <input 
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type your message..."
                        dir="auto"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm transition-all"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20">
                        <SendIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

const DoctorChatModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  doctor: Doctor;
}> = ({ isOpen, onClose, patient, doctor }) => {
  const [messages, setMessages] = useState<DoctorPatientMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchMessages = useCallback(async () => {
    const conversation = await api.getConversation(patient.id, doctor.id);
    setMessages(conversation);
    await api.markMessagesAsRead(patient.id, patient.id);
    // Emit read receipt so the doctor sees ✓✓ instantly
    const convId = chatService.getConversationId(patient.id);
    socketService.emitMessagesRead(convId, patient.id);
  }, [patient.id, doctor.id]);

  // Initialize socket connection and event handlers
  useEffect(() => {
    if (!isOpen) return;

    // Connect to socket
    socketService.connect();
    
    // Mark patient as online
    socketService.goOnline(patient.id);

    // Join conversation
    const conversationId = chatService.getConversationId(patient.id);
    socketService.joinConversation(conversationId);

    // Fetch initial messages
    fetchMessages();

    // Handle incoming messages
    const handleIncomingMessage = (socketMsg: SocketMessage) => {
      console.log('Patient received message via socket:', socketMsg);
      
      // Convert socket message to DoctorPatientMessage format
      const newMessage: DoctorPatientMessage = {
        id: socketMsg._id || `msg-${Date.now()}`,
        senderId: socketMsg.sender_id,
        receiverId: socketMsg.receiver_id,
        text: socketMsg.message,
        timestamp: new Date(socketMsg.timestamp || new Date()),
        read: socketMsg.read || false,
      };

      // Check if this message is for the current conversation
      const isRelevantMessage = 
        (socketMsg.sender_id === patient.id && socketMsg.receiver_id === doctor.id) ||
        (socketMsg.sender_id === doctor.id && socketMsg.receiver_id === patient.id);
      
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

        // Mark as read if message is from doctor to patient
        if (socketMsg.sender_id === doctor.id) {
          chatService.markMessagesAsRead({
            conversation_id: conversationId,
            user_id: patient.id,
          });
          socketService.emitMessagesRead(conversationId, patient.id);
        }
      }
    };

    // Listen for read receipts — when doctor reads our messages, update ✓→✓✓
    const handleMessagesRead = (data: { conversation_id: string; reader_id: string }) => {
      if (data.reader_id !== patient.id && data.conversation_id === conversationId) {
        setMessages(prev => prev.map(m =>
          m.senderId === patient.id && !m.read ? { ...m, read: true } : m
        ));
      }
    };

    socketService.onDocPatMessage(handleIncomingMessage);
    socketService.on('messagesRead', handleMessagesRead);

    // Cleanup on close
    return () => {
      socketService.offDocPatMessage(handleIncomingMessage);
      socketService.off('messagesRead', handleMessagesRead);
    };
  }, [isOpen, patient.id, doctor.id, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    
    const messageText = input.trim();
    setInput('');

    const conversationId = chatService.getConversationId(patient.id);
    
    try {
      // Send message via socket (which also saves to DB)
      const socketMessage: SocketMessage = {
        conversation_id: conversationId,
        sender_id: patient.id,
        receiver_id: doctor.id,
        message: messageText,
        patient_name: patient.name,
        doctor_id: doctor.id,
        patient_id: patient.id,
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
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full max-w-lg h-[90vh] flex flex-col transform transition-transform duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <style>{`
            @keyframes fade-in-scale {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1); }
        `}</style>
        <header className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Chat with {doctor.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-2xl">&times;</button>
        </header>
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
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
                <div className={`flex items-end gap-2 ${msg.senderId === patient.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-4 py-3 rounded-2xl ${msg.senderId === patient.id ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-bl-none'}`}>
                    <div dir="auto" style={{ unicodeBidi: 'plaintext', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p className="text-xs opacity-70">{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      {msg.senderId === patient.id && (
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
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              dir="auto"
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm transition-all"
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20">
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const DoctorInfo: React.FC<{ patient: Patient; doctor: Doctor | null; isChatOpen: boolean; onOpenChat: () => void; onCloseChat: () => void }> = ({ patient, doctor, isChatOpen, onOpenChat, onCloseChat }) => {

    if (!doctor) return <div>Loading doctor information...</div>;

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-6 sm:p-8 space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Your Assigned Doctor</h3>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30 flex items-center justify-center shadow-sm border border-sky-200/50 dark:border-sky-700/50">
                        <DoctorIcon/>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{doctor.name}</h4>
                        <p className="text-base text-blue-600 dark:text-blue-400 font-medium">{doctor.specialization}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Contact: {doctor.contact}</p>
                    </div>
                </div>
                <button onClick={onOpenChat} className="w-full py-3 px-4 font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-500/20">
                    Contact Doctor
                </button>
            </div>
            {doctor && <DoctorChatModal 
                isOpen={isChatOpen} 
                onClose={onCloseChat} 
                patient={patient} 
                doctor={doctor} 
            />}
        </>
    );
};


export const PatientDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('Vitals');
    const [doctor, setDoctor] = useState<Doctor | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const patient = user as Patient;
    const { addToast } = useNotification();
    const notifiedMessagesRef = useRef<Set<string>>(new Set());
    const [unreadDoctorMessages, setUnreadDoctorMessages] = useState(0);

    useEffect(() => {
        api.getDoctor(patient.assignedDoctorId).then(doc => doc && setDoctor(doc));
    }, [patient.assignedDoctorId]);

    // Connect socket on mount so appointment notifications work
    useEffect(() => {
        socketService.connect();
        socketService.goOnline(patient.id);

        // Join the patient's conversation room so newAppointment event reaches the doctor
        const conversationId = chatService.getConversationId(patient.id);
        socketService.joinConversation(conversationId);

        // Instant toast when doctor sends a message via socket
        const handleDoctorMsgToast = (socketMsg: SocketMessage) => {
            if (socketMsg.receiver_id !== patient.id || socketMsg.sender_id === patient.id) return;
            const msgId = socketMsg._id || `msg-${Date.now()}-${Math.random()}`;
            if (notifiedMessagesRef.current.has(msgId)) return;
            notifiedMessagesRef.current.add(msgId);

            const preview = socketMsg.message.length > 40 ? `${socketMsg.message.substring(0, 40)}...` : socketMsg.message;
            addToast(
                `New message from your doctor: "${preview}"`,
                'info',
                () => {
                    setIsChatOpen(true);
                    setActiveTab('Doctor Info');
                }
            );
        };

        socketService.onDocPatMessage(handleDoctorMsgToast);
        return () => { socketService.offDocPatMessage(handleDoctorMsgToast); };
    }, [patient.id, addToast]);

    useEffect(() => {
        if (!doctor) return;

        const checkMessages = async () => {
            const messages = await api.getConversation(patient.id, doctor.id);
            const unreadFromDoctor = messages.filter(m => m.senderId === doctor.id && !m.read);
            setUnreadDoctorMessages(unreadFromDoctor.length);
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];

                if (lastMessage && lastMessage.senderId === doctor.id && !lastMessage.read && !notifiedMessagesRef.current.has(lastMessage.id)) {
                     const shortMessage = lastMessage.text.length > 40 ? `${lastMessage.text.substring(0, 40)}...` : lastMessage.text;
                     addToast(
                         `New message from Dr. ${doctor.name.split(' ').pop()}: "${shortMessage}"`,
                         'info',
                         () => {
                             setIsChatOpen(true);
                             setActiveTab('Doctor Info');
                         }
                     );
                     notifiedMessagesRef.current.add(lastMessage.id);
                }
            }
        };
        
        const intervalId = setInterval(checkMessages, 5000);
        return () => clearInterval(intervalId);

    }, [patient.id, doctor, addToast]);
    
    const sidebarItems = [
        { name: 'Vitals', icon: <VitalsIcon/>, onClick: () => setActiveTab('Vitals') },
        { name: 'Appointments', icon: <AppointmentIcon/>, onClick: () => setActiveTab('Appointments') },
        { name: 'Chatbot', icon: <ChatbotIcon/>, onClick: () => setActiveTab('Chatbot') },
        { name: 'Doctor Info', icon: <div className="relative"><DoctorIcon/><span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-opacity ${unreadDoctorMessages > 0 ? 'opacity-100' : 'opacity-0'}`}>{unreadDoctorMessages}</span></div>, onClick: () => { setActiveTab('Doctor Info'); setUnreadDoctorMessages(0); } },
        { name: 'Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>, onClick: () => setActiveTab('Profile') }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'Vitals':
                return <VitalsDisplay patient={patient}/>;
            case 'Appointments':
                return <AppointmentScheduler patient={patient} />;
            case 'Chatbot':
                return <Chatbot />;
            case 'Doctor Info':
                return <DoctorInfo patient={patient} doctor={doctor} isChatOpen={isChatOpen} onOpenChat={() => setIsChatOpen(true)} onCloseChat={() => setIsChatOpen(false)} />;
            case 'Profile':
                return <ProfilePage />;
            default:
                return <VitalsDisplay patient={patient}/>;
        }
    };

    return (
        <Layout sidebarItems={sidebarItems} activeItem={activeTab}>
            {renderContent()}
        </Layout>
    );
};
