import React, { useState, useEffect, useCallback } from 'react';
import { Patient, Doctor, Appointment } from '../types';
import { appointmentService, BookAppointmentData } from '../services/appointmentService';
import { api } from '../services/mockApi';

const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;

const AVAILABLE_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

/** Format a Date as YYYY-MM-DD using LOCAL year/month/day (avoids UTC shift from toISOString). */
const toLocalDateString = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const AppointmentScheduler: React.FC<{ patient: Patient }> = ({ patient }) => {
    const [doctor, setDoctor] = useState<Doctor | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    });
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [bookedTimes, setBookedTimes] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

    const fetchAppointments = useCallback(() => {
        return appointmentService.getAppointmentsForPatient(patient.id).then(setAppointments);
    }, [patient.id]);

    useEffect(() => {
        api.getDoctor(patient.assignedDoctorId).then(doc => doc && setDoctor(doc));
        fetchAppointments();
    }, [patient.id, patient.assignedDoctorId, fetchAppointments]);
    
    useEffect(() => {
        if (selectedDate && doctor) {
            const dateString = toLocalDateString(selectedDate);
            appointmentService.getBookedTimes(doctor.id, dateString).then(setBookedTimes);
            setSelectedTime(null);
        }
    }, [selectedDate, doctor]);

    const handleDateSelect = (day: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (day >= today) {
            setSelectedDate(day);
        }
    };
    
    const handleBooking = async () => {
        if (!selectedDate || !selectedTime || !reason.trim() || !doctor) {
            setError("Please select a date, time, and provide a reason for your visit.");
            return;
        }
        setError(null);
        setSuccess(null);

        const appointmentData: BookAppointmentData = {
            patient_id: patient.id,
            doctor_id: doctor.id,
            date: toLocalDateString(selectedDate),
            time: selectedTime,
            reason: reason.trim(),
        };

        try {
            const created = await appointmentService.bookAppointment(appointmentData);
            setSuccess(`Appointment booked successfully for ${selectedTime} on ${selectedDate.toLocaleDateString()}!`);
            // Immediately append the new appointment for instant UI feedback
            setAppointments(prev => [...prev, created]);
            // Also re-fetch from backend so the list is always authoritative
            // (prevents issues with consecutive bookings where optimistic data could get stale)
            fetchAppointments();
            setSelectedTime(null);
            setReason('');
            const dateString = toLocalDateString(selectedDate);
            appointmentService.getBookedTimes(doctor.id, dateString).then(setBookedTimes);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const promptCancel = (appointmentId: string) => {
        setAppointmentToCancel(appointmentId);
        setShowCancelConfirm(true);
    };

    const handleConfirmCancel = async () => {
        if (!appointmentToCancel) return;
        setError(null);
        setSuccess(null);
        try {
            // Find the appointment being cancelled so we can refresh its date's slots
            const cancelledApp = appointments.find(a => a._id === appointmentToCancel);

            await appointmentService.cancelAppointment(appointmentToCancel);

            // Optimistically update local state — mark as cancelled so it disappears from upcoming
            setAppointments(prev => prev.map(a =>
                a._id === appointmentToCancel ? { ...a, status: 'cancelled' as const } : a
            ));

            // Also re-fetch from backend for authoritative list
            fetchAppointments();

            // Refresh booked times for the currently-selected date so the freed slot reappears
            if (doctor && selectedDate) {
                const dateString = toLocalDateString(selectedDate);
                appointmentService.getBookedTimes(doctor.id, dateString).then(setBookedTimes);
            }
            // Also refresh if the cancelled appointment's date matches the selected date
            if (doctor && cancelledApp) {
                const cancelledDate = cancelledApp.date.includes('T') ? cancelledApp.date.split('T')[0] : cancelledApp.date;
                const selectedDateStr = selectedDate ? toLocalDateString(selectedDate) : '';
                if (cancelledDate === selectedDateStr) {
                    appointmentService.getBookedTimes(doctor.id, cancelledDate).then(setBookedTimes);
                }
            }

            setSuccess('Appointment cancelled successfully.');
        } catch (e: any) {
            setError(e.message || 'Failed to cancel appointment.');
        }
        setShowCancelConfirm(false);
        setAppointmentToCancel(null);
    };

    const renderCalendar = () => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const today = new Date();
        today.setHours(0,0,0,0);

        const calendarDays = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="p-2"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dayDate = new Date(year, month, i);
            const isToday = dayDate.getTime() === today.getTime();
            const isSelected = selectedDate && dayDate.getTime() === selectedDate.getTime();
            const isPast = dayDate < today;

            let dayClass = "w-full aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200";

            if (isPast) {
                dayClass += " text-slate-400 cursor-not-allowed";
            } else if (isSelected) {
                dayClass += " bg-blue-600 text-white font-bold shadow-lg transform scale-105";
            } else if (isToday) {
                dayClass += " bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold";
            } else {
                dayClass += " text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700";
            }

            calendarDays.push(
                <button
                    key={i}
                    disabled={isPast}
                    onClick={() => handleDateSelect(dayDate)}
                    className={dayClass}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeftIcon /></button>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRightIcon /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div className="grid grid-cols-7 gap-2">{calendarDays}</div>
            </div>
        );
    };

    const upcomingAppointments = appointments.filter(a => {
        const appDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
        return new Date(`${appDate}T00:00:00`) >= new Date(new Date().setHours(0,0,0,0)) && a.status === 'booked';
    }).sort((a,b) => {
        const dateA = a.date.includes('T') ? a.date.split('T')[0] : a.date;
        const dateB = b.date.includes('T') ? b.date.split('T')[0] : b.date;
        return new Date(`${dateA}T${a.time}`).getTime() - new Date(`${dateB}T${b.time}`).getTime();
    });

    return (
        <>
            {/* Global feedback banners */}
            {success && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="ml-auto p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-full"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            )}
            {error && !selectedTime && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {renderCalendar()}
                    {selectedDate && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                            <h3 className="font-semibold mb-4 text-slate-800 dark:text-white">Available Slots for {selectedDate.toLocaleDateString()}</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {AVAILABLE_TIMES.map(time => {
                                    const isBooked = bookedTimes.includes(time);

                                    // Disable slots that have already passed when the selected date is today
                                    const now = new Date();
                                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                    const selectedDateStr = selectedDate ? toLocalDateString(selectedDate) : '';
                                    const isToday = selectedDateStr === todayStr;
                                    const isPastSlot = isToday && (() => {
                                        const [h, m] = time.split(':').map(Number);
                                        const slotMinutes = h * 60 + m;
                                        const nowMinutes = now.getHours() * 60 + now.getMinutes();
                                        return slotMinutes <= nowMinutes;
                                    })();

                                    const isDisabled = isBooked || isPastSlot;
                                    return (
                                        <button
                                            key={time}
                                            disabled={isDisabled}
                                            onClick={() => setSelectedTime(time)}
                                            className={`
                                                p-3 rounded-lg text-sm font-medium transition-colors duration-200
                                                ${isDisabled ? 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-blue-200'}
                                                ${selectedTime === time ? 'bg-blue-600 text-white font-bold ring-2 ring-offset-2 ring-blue-500' : ''}
                                            `}
                                        >
                                            {time}{isPastSlot && !isBooked ? ' (passed)' : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {selectedTime && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                             <h3 className="font-semibold mb-2 text-slate-800 dark:text-white">Book for {selectedTime} on {selectedDate?.toLocaleDateString()}</h3>
                             <textarea 
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)} 
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md mb-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                placeholder="Reason for visit..."
                            ></textarea>
                            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                            {success && <p className="text-emerald-600 text-sm mb-3">{success}</p>}
                            <button onClick={handleBooking} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Confirm Booking</button>
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                     <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Your Appointments</h3>
                     <div className="space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
                        {upcomingAppointments.length > 0 ? upcomingAppointments.map(app => {
                            const appDate = app.date.includes('T') ? app.date.split('T')[0] : app.date;
                            return (
                            <div key={app._id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                                 <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center text-slate-700 dark:text-slate-300 font-semibold">
                                        <CalendarIcon />
                                        <span>{new Date(appDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at {app.time}</span>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Booked</span>
                                 </div>
                                 {doctor && <p className="text-sm text-slate-600 dark:text-slate-400 pl-7 mb-1"><strong>Doctor:</strong> {doctor.name}</p>}
                                <p className="text-sm text-slate-600 dark:text-slate-400 pl-7 mb-2"><strong>Reason:</strong> {app.reason}</p>
                                <div className="pl-7">
                                   <button onClick={() => promptCancel(app._id)} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">Cancel Appointment</button>
                                </div>
                            </div>
                            );
                        }) : <p className="text-slate-500 dark:text-slate-400">You have no upcoming appointments.</p>}
                     </div>
                </div>
            </div>

            {showCancelConfirm && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
                    aria-labelledby="cancel-title"
                    role="dialog"
                    aria-modal="true"
                >
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm transform transition-all animate-fade-in-scale">
                    <style>{`
                        @keyframes fade-in-scale {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        .animate-fade-in-scale { animation: fade-in-scale 0.2s forwards cubic-bezier(0.16, 1, 0.3, 1); }
                    `}</style>
                    <div className="p-6">
                        <h3 id="cancel-title" className="text-lg font-semibold text-slate-900 dark:text-white">Confirm Cancellation</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Are you sure you want to cancel this appointment? This action cannot be undone.
                        </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
                        <button
                            type="button"
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            onClick={() => setShowCancelConfirm(false)}
                        >
                            No
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            onClick={handleConfirmCancel}
                        >
                            Yes, Cancel
                        </button>
                    </div>
                  </div>
                </div>
            )}
        </>
    );
};