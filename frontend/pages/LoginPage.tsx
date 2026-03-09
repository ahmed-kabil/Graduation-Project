
import React, { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

const HeartPulseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor" opacity="0.15"/>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        <polyline points="3.5 12 8.5 12 10 10 12 14 14 10 15.5 12 20.5 12"/>
    </svg>
);

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


export const LoginPage: React.FC = () => {
    const { login, isLoading, error, errorField, clearError } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localErrors, setLocalErrors] = useState<{ email?: string; password?: string }>({});

    const clearAllErrors = () => {
        if (error) clearError();
        setLocalErrors({});
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        clearAllErrors();
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        clearAllErrors();
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();

        // Client-side validation
        const errors: { email?: string; password?: string } = {};
        if (!email.trim() && !password.trim()) {
            errors.email = 'Please enter email and password';
            errors.password = ' '; // flag to highlight the field
            setLocalErrors(errors);
            return;
        }
        if (!email.trim()) {
            errors.email = 'Please enter your email';
            setLocalErrors(errors);
            return;
        }
        if (!password.trim()) {
            errors.password = 'Please enter your password';
            setLocalErrors(errors);
            return;
        }

        setLocalErrors({});
        await login(email, password);
        // Inputs are NOT cleared — values stay on failure
    };

    // Determine which field should have a red border
    const emailHasError = !!localErrors.email || (!!error && (errorField === 'email' || errorField === null));
    const passwordHasError = !!localErrors.password || (!!error && (errorField === 'password' || errorField === null));

    // The error message to show under each field
    const emailErrorMsg = localErrors.email || (error && errorField === 'email' ? error : null);
    const passwordErrorMsg = (localErrors.password && localErrors.password.trim()) ? localErrors.password : (error && errorField === 'password' ? error : null);

    // Show a general error only when there's no field-specific error
    const generalError = error && !errorField && !Object.keys(localErrors).length ? error : null;

    const baseInputClasses = "w-full px-4 py-3 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700/80 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-sm";
    const normalBorder = "border-slate-200 dark:border-slate-600 focus:ring-blue-500/40 focus:border-blue-500";
    const errorBorder = "border-red-400 focus:ring-red-500/40 focus:border-red-400 bg-red-50/80";
    const buttonClasses = "w-full py-3 px-4 font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40";

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"/>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-200/30 dark:bg-sky-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"/>

            {/* Login card */}
            <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/30 border border-white/60 dark:border-slate-700/50">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                            <polyline points="3.5 12 8.5 12 10 10 12 14 14 10 15.5 12 20.5 12"/>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Welcome back</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Sign in to NABD Medical Portal</p>
                </div>
                <form onSubmit={handleLogin} noValidate className="space-y-4">
                    {/* Email field */}
                    <div>
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={handleEmailChange}
                            className={`${baseInputClasses} ${emailHasError ? errorBorder : normalBorder}`}
                            autoComplete="email"
                        />
                        {emailErrorMsg && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {emailErrorMsg}
                            </p>
                        )}
                    </div>

                    {/* Password field with show/hide toggle */}
                    <div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={handlePasswordChange}
                                className={`${baseInputClasses} pr-11 ${passwordHasError ? errorBorder : normalBorder}`}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none"
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        {passwordErrorMsg && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {passwordErrorMsg}
                            </p>
                        )}
                    </div>

                    {/* General error (e.g. network / unexpected) */}
                    {generalError && (
                        <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl" role="alert">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 flex-shrink-0">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <span>{generalError}</span>
                        </div>
                    )}
                    
                    <button type="submit" className={buttonClasses} disabled={isLoading}>
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                Signing In...
                            </span>
                        ) : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
};
