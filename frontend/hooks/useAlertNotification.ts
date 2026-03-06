import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '../types';
import { alertSoundService } from '../services/alertSoundService';

/**
 * React hook that bridges the AlertSoundService into the component tree.
 *
 * Provides:
 *  - `permissionState` — current Notification API permission.
 *  - `isAlarmPlaying`  — whether the in-page alarm is currently sounding.
 *  - `requestPermission()` — prompt the user (must be from a user gesture).
 *  - `triggerAlert(alert)` — fire system notification + in-page alarm.
 *  - `stopAlarm()`         — silence the in-page alarm immediately.
 */
export function useAlertNotification() {
  const [permissionState, setPermissionState] = useState<
    NotificationPermission | 'unsupported'
  >(alertSoundService.getNotificationPermission());

  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const alarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: set up the auto-unlock listener so the AudioContext gets
  // resumed on the user's first interaction with the page.
  useEffect(() => {
    alertSoundService.setupAutoUnlock();
  }, []);

  // Keep permission state in sync (e.g., if granted in another tab).
  useEffect(() => {
    const interval = setInterval(() => {
      const current = alertSoundService.getNotificationPermission();
      setPermissionState((prev) => (prev !== current ? current : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Request notification permission AND unlock audio context.
   * Must be called from a click / tap handler.
   */
  const requestPermission = useCallback(async () => {
    const result = await alertSoundService.requestNotificationPermission();
    setPermissionState(result);

    // The click that triggered this function is a valid user gesture,
    // so we can also unlock the AudioContext.
    await alertSoundService.unlockAudio();

    return result;
  }, []);

  /**
   * Fire a full alert cycle:
   *  1. Native system notification (with default device sound).
   *  2. In-page ICU alarm beeps for 5 seconds.
   */
  const triggerAlert = useCallback((alert: Alert) => {
    // ── System notification ──
    alertSoundService.showSystemNotification(
      `⚠️ Critical Alert: ${alert.patientName}`,
      `${alert.vital}: ${alert.value} — ${alert.message}`,
      { tag: `vital-${alert.patientId}-${alert.vital}` }
    );

    // ── In-page alarm ──
    if (!alertSoundService.getIsAlarmPlaying()) {
      const duration = 5000;
      alertSoundService.playEmergencyAlarm(duration);
      setIsAlarmPlaying(true);

      // Clear any previous timer
      if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);

      alarmTimerRef.current = setTimeout(() => {
        setIsAlarmPlaying(false);
        alarmTimerRef.current = null;
      }, duration);
    }
  }, []);

  /** Immediately stop the in-page alarm. */
  const stopAlarm = useCallback(() => {
    alertSoundService.stopEmergencyAlarm();
    setIsAlarmPlaying(false);
    if (alarmTimerRef.current) {
      clearTimeout(alarmTimerRef.current);
      alarmTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);
    };
  }, []);

  return {
    permissionState,
    isAlarmPlaying,
    requestPermission,
    triggerAlert,
    stopAlarm,
  } as const;
}
