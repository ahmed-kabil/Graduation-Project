// src/App.tsx

import React from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { NurseDashboard } from './pages/NurseDashboard';
import { ReceptionistDashboard } from './pages/ReceptionistDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Role, User } from './types'; // Import User if not already
import { ToastContainer } from './components/ToastNotification';
import { GlobalVitalsMonitor } from './components/GlobalVitalsMonitor';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';

const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  return (
    <>
      <ToastContainer />
      {user && (user.role === Role.Doctor || user.role === Role.Nurse) && <GlobalVitalsMonitor user={user} />}
      {user && (user.role === Role.Doctor || user.role === Role.Nurse) && <NotificationPermissionBanner />}
      {(() => {
        if (isLoading) {
          return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white">Loading...</div>;
        }

        if (!user) {
          return <LoginPage />;
        }

        console.log("Logged-in user role:", user.role);

        switch (user.role) {
          case Role.Patient:
            return <PatientDashboard />;
          case Role.Doctor:
            return <DoctorDashboard />;
          case Role.Nurse:
            return <NurseDashboard />;
          case Role.Receptionist:
            return <ReceptionistDashboard />;
          case Role.Admin:
            return <AdminDashboard />;
          default:
            // MODIFICATION: Type assertion to User
            console.warn("Unknown user role encountered:", (user as User).role);
            return <LoginPage />;
        }
      })()}
    </>
  );
};

export default App;