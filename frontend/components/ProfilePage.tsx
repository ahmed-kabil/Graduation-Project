import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Role, Doctor, Nurse, Receptionist, Patient } from '../types';

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
);

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);

const ProfileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const getRoleBadgeColor = (role?: Role) => {
    switch (role) {
        case Role.Doctor: return 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300';
        case Role.Nurse: return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
        case Role.Patient: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
        case Role.Receptionist: return 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300';
        case Role.Admin: return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300';
        default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
};

const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

export const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [showPassword, setShowPassword] = useState(false);

    if (!user) return null;

    // Extract role-specific fields
    const age = (user as any).age;
    const gender = (user as any).gender;
    const specialization = (user as Doctor).specialization;
    const contact = (user as Doctor).contact;
    const deviceId = (user as Patient).deviceId;
    const password = (user as any).password || '••••••••';

    const infoRows: { label: string; value: React.ReactNode }[] = [
        { label: 'Full Name', value: user.name },
        { label: 'User ID', value: <span className="font-mono">{user.id}</span> },
        ...(age !== undefined ? [{ label: 'Age', value: `${age}` }] : []),
        ...(gender ? [{ label: 'Gender', value: capitalize(gender) }] : []),
        { label: 'Role', value: <span className={`inline-block px-3 py-0.5 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>{capitalize(user.role)}</span> },
        { label: 'Email', value: user.email },
        ...(specialization ? [{ label: 'Specialization', value: specialization }] : []),
        ...(contact ? [{ label: 'Contact', value: contact }] : []),
        ...(deviceId ? [{ label: 'Device ID', value: <span className="font-mono">{deviceId}</span> }] : []),
    ];

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
                {/* Header banner */}
                <div className="h-28 bg-gradient-to-r from-blue-600 to-sky-500 dark:from-blue-800 dark:to-sky-700 relative">
                    <div className="absolute -bottom-10 left-6">
                        <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-700 border-4 border-white dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-300 shadow-lg">
                            <ProfileIcon />
                        </div>
                    </div>
                </div>

                <div className="pt-14 px-6 pb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{user.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{capitalize(user.role)} &bull; {user.id}</p>
                </div>
            </div>

            {/* Profile Information */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Profile Information
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {infoRows.map((row, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center py-3 gap-1 sm:gap-0">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 sm:w-40 flex-shrink-0">{row.label}</span>
                            <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">{row.value}</span>
                        </div>
                    ))}
                    {/* Password row with eye toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center py-3 gap-1 sm:gap-0">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 sm:w-40 flex-shrink-0">Password</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-800 dark:text-slate-200 font-medium font-mono">
                                {showPassword ? password : '••••••••'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Theme Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Theme Settings
                </h3>
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                        <div className="text-amber-500 dark:text-slate-400">
                            <SunIcon />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {theme === 'dark' ? 'Switch to light mode for a brighter interface' : 'Switch to dark mode for a darker interface'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                            {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
                        </span>
                        {/* Toggle switch */}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={theme === 'dark'}
                            onClick={toggleTheme}
                            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                                theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
