import React, { useState, useEffect } from 'react';
import { Doctor, Patient, Appointment } from '../types';
import { appointmentService } from '../services/appointmentService';
import { api } from '../services/mockApi';

const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 10.586V6z" clipRule="evenodd" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;

type AppointmentWithName = Appointment & { patientName: string };
type GroupedAppointments = Record<string, AppointmentWithName[]>;

interface DoctorAppointmentsViewProps {
    doctor: Doctor;
    onSelectPatient: (patientId: string) => void;
}

export const DoctorAppointmentsView: React.FC<DoctorAppointmentsViewProps> = ({ doctor, onSelectPatient }) => {
    const [appointments, setAppointments] = useState<GroupedAppointments>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAppointments = async () => {
            setIsLoading(true);
            // Fetch doctor's patients for name lookups
            const doctorPatients = await api.getDoctorPatients(doctor.id);
            
            // Use real API: GET /api/appointments/for_doc/{doctor_id}
            const appointmentList = await appointmentService.getAppointmentsForDoctor(doctor.id);
            
            // Only show booked appointments
            const bookedAppointments = appointmentList.filter(app => app.status === 'booked');
            
            const appointmentsWithPatientNames: AppointmentWithName[] = bookedAppointments.map(app => {
                const patient = doctorPatients.find(p => p.id === app.patient_id);
                return { ...app, patientName: patient?.name || app.patient_id };
            });

            const grouped = appointmentsWithPatientNames
                .sort((a, b) => {
                    const dateA = a.date.includes('T') ? a.date.split('T')[0] : a.date;
                    const dateB = b.date.includes('T') ? b.date.split('T')[0] : b.date;
                    return new Date(`${dateA}T${a.time}`).getTime() - new Date(`${dateB}T${b.time}`).getTime();
                })
                .reduce((acc, app) => {
                    const appDate = app.date.includes('T') ? app.date.split('T')[0] : app.date;
                    const date = new Date(appDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    if (!acc[date]) {
                        acc[date] = [];
                    }
                    acc[date].push(app);
                    return acc;
                }, {} as GroupedAppointments);

            setAppointments(grouped);
            setIsLoading(false);
        };

        fetchAppointments();
        const intervalId = setInterval(fetchAppointments, 10000);
        return () => clearInterval(intervalId);
    }, [doctor]);

    const handleFulfill = async (appointmentId: string) => {
        try {
            await appointmentService.fulfillAppointment(appointmentId);
            // Remove from grouped state
            setAppointments(prev => {
                const updated = { ...prev };
                for (const date of Object.keys(updated)) {
                    updated[date] = updated[date].filter(a => a._id !== appointmentId);
                    if (updated[date].length === 0) delete updated[date];
                }
                return updated;
            });
        } catch (err) {
            console.error('Failed to fulfill appointment:', err);
        }
    };

    if (isLoading) {
        return <div className="p-6 text-slate-600 dark:text-slate-400">Loading appointments...</div>;
    }

    const sortedDates = Object.keys(appointments).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)] flex flex-col">
            <h3 className="text-2xl font-semibold text-slate-800 dark:text-white mb-6 border-b pb-4">Upcoming Appointments</h3>
            <div className="flex-1 overflow-y-auto">
                {sortedDates.length > 0 ? (
                    <div className="space-y-6">
                        {sortedDates.map(date => (
                            <div key={date}>
                                <h4 className="font-bold text-lg text-slate-700 dark:text-slate-300 mb-3 sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm py-2">{date}</h4>
                                <div className="space-y-3">
                                    {appointments[date].map(app => (
                                        <div 
                                            key={app._id} 
                                            className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-all duration-200"
                                        >
                                            <div className="flex justify-between items-start">
                                                <button
                                                    onClick={() => onSelectPatient(app.patient_id)}
                                                    className="text-left flex-1 focus:outline-none"
                                                    aria-label={`View details for ${app.patientName}'s appointment at ${app.time}`}
                                                >
                                                    <p className="font-semibold text-slate-800 dark:text-white">{app.patientName}</p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1"><strong>Reason:</strong> {app.reason}</p>
                                                </button>
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                    <div className="flex items-center text-sm font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-full">
                                                        <ClockIcon />
                                                        {app.time}
                                                    </div>
                                                    <button
                                                        onClick={() => handleFulfill(app._id)}
                                                        className="flex items-center gap-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition"
                                                        title="Mark as fulfilled"
                                                    >
                                                        <CheckIcon />
                                                        Fulfill
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-center mt-8">No upcoming appointments scheduled.</p>
                )}
            </div>
        </div>
    );
};
