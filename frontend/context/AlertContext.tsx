import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Alert } from '../types';

const SEEN_ALERTS_KEY = 'hospital_seen_alert_ids';

const loadSeenIds = (): Set<string> => {
  try {
    const stored = localStorage.getItem(SEEN_ALERTS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch { return new Set(); }
};

const saveSeenIds = (ids: Set<string>) => {
  try { localStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify([...ids])); } catch {}
};

interface AlertContextType {
  alerts: Alert[];
  unreadCount: number;
  addAlert: (newAlert: Alert) => void;
  removeAlert: (patientId: string, vitalName: Alert['vital']) => void;
  dismissAlert: (alertId: string) => void;
  markAllRead: () => void;
  isAlertRead: (alertId: string) => boolean;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(loadSeenIds);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Persist seenIds to localStorage whenever it changes
  useEffect(() => { saveSeenIds(seenIds); }, [seenIds]);

  const addAlert = useCallback((newAlert: Alert) => {
    setAlerts(prevAlerts => {
      const existingAlertIndex = prevAlerts.findIndex(
        a => a.patientId === newAlert.patientId && a.vital === newAlert.vital
      );

      if (existingAlertIndex > -1) {
        const existingAlert = prevAlerts[existingAlertIndex];
        const updatedAlerts = [...prevAlerts];

        // If the alert was already read (seen) or dismissed, assign a fresh ID
        // so the badge increments again for the updated alert.
        if (seenIds.has(existingAlert.id) || dismissedIds.has(existingAlert.id)) {
          const freshId = `alert-${newAlert.patientId}-${newAlert.vital}-${Date.now()}`;
          updatedAlerts[existingAlertIndex] = { ...newAlert, id: freshId };

          // Clean up the old ID from seenIds and dismissedIds
          setSeenIds(prev => {
            const next = new Set(prev);
            next.delete(existingAlert.id);
            return next;
          });
          setDismissedIds(prev => {
            if (!prev.has(existingAlert.id)) return prev;
            const next = new Set(prev);
            next.delete(existingAlert.id);
            return next;
          });
        } else {
          updatedAlerts[existingAlertIndex] = newAlert;
        }
        return updatedAlerts;
      }
      return [newAlert, ...prevAlerts];
    });
  }, [seenIds, dismissedIds]);
  
  const removeAlert = useCallback((patientId: string, vitalName: Alert['vital']) => {
    setAlerts(prevAlerts => prevAlerts.filter(a => !(a.patientId === patientId && a.vital === vitalName)));
  }, []);

  // Dismiss a specific alert (user clicks X on an alert card)
  const dismissAlert = useCallback((alertId: string) => {
    setDismissedIds(prev => new Set(prev).add(alertId));
    setSeenIds(prev => { const next = new Set(prev); next.add(alertId); return next; });
  }, []);

  // Mark all currently visible alerts as read (when opening Alerts tab)
  const markAllRead = useCallback(() => {
    setAlerts(current => {
      setSeenIds(prev => {
        const next = new Set(prev);
        current.forEach(a => next.add(a.id));
        return next;
      });
      return current;
    });
  }, []);

  // Filter out dismissed alerts for display
  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));
  const unreadCount = visibleAlerts.filter(a => !seenIds.has(a.id)).length;

  const isAlertRead = useCallback((alertId: string) => seenIds.has(alertId), [seenIds]);

  return (
    <AlertContext.Provider value={{ alerts: visibleAlerts, unreadCount, addAlert, removeAlert, dismissAlert, markAllRead, isAlertRead }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
