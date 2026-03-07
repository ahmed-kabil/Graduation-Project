//  GolabalVitalsMOnitor.tsx


import { useEffect, useRef, useState } from 'react';
import { api } from '../services/mockApi';
import { Patient, VitalSign, Alert, Role, LoggedInUser, Doctor } from '../types';
import { useAlert } from '../context/AlertContext';
import { useNotification } from '../context/NotificationContext';
import { useAlertNotification } from '../hooks/useAlertNotification';

const createInitialVitals = (): VitalSign[] => [
    { name: 'Heart Rate', value: 0, unit: 'BPM', thresholds: { min: 50, max: 120 } },
    { name: 'Temperature', value: 0, unit: '°C', thresholds: { min: 36.1, max: 37.8 } },
    { name: 'Respiration Rate', value: 0, unit: 'breaths/min', thresholds: { min: 12, max: 20 } },
    { name: 'SpO2', value: 0, unit: '%', thresholds: { min: 95, max: 100 } },
];

const vitalKeyMap: Record<string, VitalSign['name']> = {
    heart_rate: 'Heart Rate',
    temperature: 'Temperature',
    respiration_rate: 'Respiration Rate',
    spo2: 'SpO2'
};

interface GlobalVitalsMonitorProps {
    user: LoggedInUser;
}

export const GlobalVitalsMonitor: React.FC<GlobalVitalsMonitorProps> = ({ user }) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const { addAlert, removeAlert } = useAlert();
    const { addToast } = useNotification();
    const { triggerAlert } = useAlertNotification();
    const previousAlertStatusRef = useRef<Record<string, boolean>>({});

    // Fetch patients based on role:
    // - Nurse: fetch ALL patients (global monitoring access)
    // - Doctor: fetch ONLY their assigned patients
    useEffect(() => {
        if (user.role === Role.Nurse) {
            api.getAllPatients().then(setPatients);
        } else if (user.role === Role.Doctor) {
            api.getDoctorPatients(user.id).then(setPatients);
        }
    }, [user.role, user.id]);

    useEffect(() => {
        if (patients.length === 0) return;

        const checkAllVitals = async () => {
            try {
                const allReadings = await api.getAllReadings();
                
                // Get the latest reading for each device
                const latestReadings = allReadings.reduce((acc: Record<string, any>, reading: any) => {
                    if (!acc[reading.device_id] || new Date(reading.timestamp) > new Date(acc[reading.device_id].timestamp)) {
                        acc[reading.device_id] = reading;
                    }
                    return acc;
                }, {});

                patients.forEach(patient => {
                    const reading = latestReadings[patient.deviceId];
                    if (!reading) return;

                    const vitalsTemplate = createInitialVitals();
                    vitalsTemplate.forEach(vital => {
                        const apiKey = Object.keys(vitalKeyMap).find(key => vitalKeyMap[key] === vital.name);
                        if (apiKey && reading.sensors[apiKey] !== undefined) {
                            const value = parseFloat(Number(reading.sensors[apiKey]).toFixed(1));
                            
                            const alertKey = `${patient.id}-${vital.name}`;
                            const isCurrentlyAlerting = vital.thresholds ? (value < vital.thresholds.min || value > vital.thresholds.max) : false;
                            const wasPreviouslyAlerting = previousAlertStatusRef.current[alertKey] || false;

                            if (isCurrentlyAlerting) {
                                const newAlert: Alert = {
                                    id: `alert-${patient.id}-${vital.name}`,
                                    patientName: patient.name,
                                    patientId: patient.id,
                                    vital: vital.name,
                                    value: value,
                                    timestamp: new Date(),
                                    message: `${vital.name} is ${value < (vital.thresholds?.min || 0) ? 'critically low' : 'critically high'}`,
                                };
                                addAlert(newAlert);
                                if (!wasPreviouslyAlerting) {
                                   addToast(`Critical Alert for ${newAlert.patientName}: ${newAlert.message}`, 'error');
                                   // System notification + in-page alarm sound
                                   triggerAlert(newAlert);
                                }
                            } else if (wasPreviouslyAlerting) {
                                removeAlert(patient.id, vital.name);
                            }
                            
                            previousAlertStatusRef.current[alertKey] = isCurrentlyAlerting;
                        }
                    });
                });

            } catch (error) {
                console.error("GlobalVitalsMonitor: Failed to fetch readings", error);
            }
        };

        checkAllVitals(); // Run immediately on mount
        const intervalId = setInterval(checkAllVitals, 5000);
        return () => clearInterval(intervalId);

    }, [patients, addAlert, removeAlert, addToast, triggerAlert]);

    return null;
};
