import React, { useState, useEffect } from 'react';
import { useAlertNotification } from '../hooks/useAlertNotification';

const DISMISSED_KEY = 'hospital_notification_banner_dismissed';

/**
 * A one-time banner that prompts staff to enable browser notifications
 * and unlock audio for critical vital alerts.
 *
 * - Appears only when Notification permission is still 'default'.
 * - Disappears once the user clicks Enable or Dismiss.
 * - Remembers dismissal in localStorage so it doesn't reappear.
 */
export const NotificationPermissionBanner: React.FC = () => {
  const { permissionState, requestPermission } = useAlertNotification();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [settling, setSettling] = useState(false);

  // Hide the banner once permission is decided (granted / denied)
  useEffect(() => {
    if (permissionState === 'granted' || permissionState === 'denied') {
      setDismissed(true);
      try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
    }
  }, [permissionState]);

  if (dismissed || permissionState !== 'default') return null;

  const handleEnable = async () => {
    setSettling(true);
    await requestPermission();
    setSettling(false);
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
  };

  return (
    <>
      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        .notification-banner-animate {
          animation: slide-down 0.35s ease-out forwards;
        }
      `}</style>

      <div className="notification-banner-animate fixed top-0 inset-x-0 z-[110] flex items-center justify-center gap-4 bg-amber-500 text-white px-4 py-3 shadow-lg text-sm font-medium">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        <span>
          Enable notifications to receive <strong>sound alerts</strong> when
          patient vitals become critical.
        </span>

        <button
          onClick={handleEnable}
          disabled={settling}
          className="rounded-md bg-white text-amber-700 px-4 py-1.5 text-sm font-semibold hover:bg-amber-50 transition-colors disabled:opacity-60"
        >
          {settling ? 'Requesting…' : 'Enable'}
        </button>

        <button
          onClick={handleDismiss}
          className="ml-1 p-1.5 rounded-full hover:bg-amber-600 transition-colors"
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </>
  );
};
