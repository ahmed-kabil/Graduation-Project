import { Appointment } from '../types';
import { socketService } from './socketService';
import { chatService } from './chatService';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const BASE_URL = backendUrl !== undefined ? `${backendUrl}/api` : '/api';

/**
 * Helper for authenticated API requests
 */
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = sessionStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `API request failed: ${response.statusText}`);
  }
  return response.json();
};

export interface BookAppointmentData {
  patient_id: string;
  doctor_id: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm
  reason: string;
}

export const appointmentService = {
  /**
   * GET /api/appointments/for_pat/{patient_id}
   */
  getAppointmentsForPatient: async (patientId: string): Promise<Appointment[]> => {
    const res = await apiRequest(`/appointments/for_pat/${patientId}`);
    return (res.data?.appointments || res.data?.patAppointments || []) as Appointment[];
  },

  /**
   * GET /api/appointments/for_doc/{doctor_id}
   */
  getAppointmentsForDoctor: async (doctorId: string): Promise<Appointment[]> => {
    const res = await apiRequest(`/appointments/for_doc/${doctorId}`);
    return (res.data?.appointments || res.data?.docAppointments || []) as Appointment[];
  },

  /**
   * Derive booked time slots for a given doctor+date from the doctor's appointment list
   */
  getBookedTimes: async (doctorId: string, date: string): Promise<string[]> => {
    const appointments = await appointmentService.getAppointmentsForDoctor(doctorId);
    return appointments
      .filter(app => {
        const appDate = app.date.includes('T') ? app.date.split('T')[0] : app.date;
        return appDate === date && app.status === 'booked';
      })
      .map(app => app.time);
  },

  /**
   * POST /api/appointments/add
   * Also emits a socket "newAppointment" event for real-time doctor notification.
   */
  bookAppointment: async (data: BookAppointmentData): Promise<Appointment> => {
    const res = await apiRequest('/appointments/add', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const created: Appointment = res.data?.appointment || res.data;

    // Real-time notification via socket
    try {
      socketService.connect();
      const conversationId = chatService.getConversationId(data.patient_id);
      socketService.joinConversation(conversationId);

      const socket = socketService.getSocket();
      if (socket && socketService.isConnected()) {
        const notificationData = {
          patient_id: data.patient_id,
          doctor_id: data.doctor_id,
          date: data.date,
          time: data.time,
          reason: data.reason,
          conversation_id: conversationId,
        };
        socket.emit('newAppointment', notificationData);
        console.log('📅 newAppointment socket event emitted:', notificationData);
      }
    } catch (err) {
      console.warn('⚠️ Failed to emit newAppointment socket event:', err);
    }

    return created;
  },

  /**
   * DELETE /api/appointments/{_id}
   */
  cancelAppointment: async (appointmentId: string): Promise<boolean> => {
    await apiRequest(`/appointments/${appointmentId}`, { method: 'DELETE' });
    return true;
  },

  /**
   * POST /api/appointments/fulfill
   */
  fulfillAppointment: async (appointmentId: string): Promise<Appointment> => {
    const res = await apiRequest('/appointments/fulfill', {
      method: 'POST',
      body: JSON.stringify({ _id: appointmentId }),
    });
    return res.data?.appointment || res.data;
  },
};
