import React, { ReactNode, useState, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface LayoutProps {
  children: ReactNode;
  sidebarItems: { name: string; icon: ReactNode; onClick: () => void }[];
  activeItem: string;
}

const LogoIcon = ({ size = 32 }: { size?: number }) => {
    const uid = useId();
    const gradId = `heartGrad${uid}`;
    return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 70 C40 70 8 48 8 28 C8 16 17 8 28 8 C33.5 8 38 10.5 40 14 C42 10.5 46.5 8 52 8 C63 8 72 16 72 28 C72 48 40 70 40 70Z" fill={`url(#${gradId})`} />
        <polyline points="12,40 26,40 30,40 34,32 38,50 42,28 46,46 50,36 54,40 68,40" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id={gradId} x1="8" y1="8" x2="72" y2="70" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="50%" stopColor="#0d9488"/><stop offset="100%" stopColor="#0ea5e9"/></linearGradient></defs>
    </svg>
    );
};
const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

const getRoleBadge = (role?: Role) => {
  switch(role) {
    case Role.Patient: return { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' };
    case Role.Doctor: return { bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-700 dark:text-sky-300' };
    case Role.Nurse: return { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' };
    case Role.Receptionist: return { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300' };
    case Role.Admin: return { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300' };
    default: return { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300' };
  }
};

export const Layout: React.FC<LayoutProps> = ({ children, sidebarItems, activeItem }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const roleBadge = getRoleBadge(user?.role);
  
  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col bg-white dark:bg-slate-800 border-r border-slate-200/80 dark:border-slate-700/80 shadow-sidebar">
          {/* Logo Area */}
          <div className="h-[72px] flex items-center px-6 border-b border-slate-100 dark:border-slate-700/80">
            <LogoIcon />
            <div className="ml-3">
              <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">NABD</h1>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hospital</p>
            </div>
          </div>

          {/* User Info */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/80">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user?.name}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${roleBadge.bg} ${roleBadge.text}`}>
                  {capitalize(user?.role)}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Menu</p>
            <ul className="space-y-1">
              {sidebarItems.map((item) => (
                <li key={item.name}>
                  <button
                    onClick={item.onClick}
                    className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeItem === item.name
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className={`mr-3 flex-shrink-0 ${activeItem === item.name ? 'text-blue-600 dark:text-blue-400' : ''}`}>{item.icon}</span>
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sidebar Footer - logout hidden on desktop since header has it */}
          <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-700/80 lg:hidden">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
            >
              <LogoutIcon />
              <span className="ml-3">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="lg:hidden h-16 bg-white/80 dark:bg-slate-800/90 backdrop-blur-lg border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <LogoIcon size={36} />
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-none">NABD</h2>
                <p className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none mt-0.5">Hospital</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogoutIcon />
              </button>
            </div>
          </header>

          {/* Desktop Header */}
          <header className="hidden lg:flex h-[72px] bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 items-center justify-between px-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {activeItem}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {capitalize(user?.role)} Dashboard
              </p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
            >
              <LogoutIcon />
              <span className="ml-2 text-sm font-medium">Logout</span>
            </button>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
            <div className="tab-content-enter">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-700/60 shadow-bottom-nav z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {sidebarItems.map((item) => (
            <button
              key={item.name}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                activeItem === item.name
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className={`mb-0.5 transition-transform duration-200 ${activeItem === item.name ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium truncate max-w-[64px] ${
                activeItem === item.name ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
              }`}>{item.name}</span>
              {activeItem === item.name && (
                <span className="absolute top-0 w-8 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>
      
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            aria-labelledby="logout-title"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowLogoutConfirm(false)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in-scale" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
                <h3 id="logout-title" className="text-lg font-bold text-slate-900 dark:text-white">Confirm Logout</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Are you sure you want to log out of your account?
                </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
                <button
                    type="button"
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => setShowLogoutConfirm(false)}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-md shadow-red-500/20"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
