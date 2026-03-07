
import React, { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

const RedCrescentIcon = () => (
    <svg xmlns="http://www.w.w3.org/2000/svg" className="h-10 w-10 mx-auto text-red-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
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

    const baseInputClasses = "w-full px-4 py-2 text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-700/80 border rounded-md focus:outline-none focus:ring-2 transition";
    const normalBorder = "border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-transparent";
    const errorBorder = "border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50/80";
    const buttonClasses = "w-full py-3 px-4 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors";

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Full-screen background image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/hospital-bg.jpg')" }}
            />
            {/* Subtle overlay for readability */}
            <div className="absolute inset-0 bg-white/30 dark:bg-black/50 backdrop-blur-[2px]" />

            {/* Login card with transparency */}
            <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/80 dark:bg-slate-800/85 backdrop-blur-md rounded-xl shadow-2xl border border-white/40 dark:border-slate-700/50">
                <div className="text-center mb-6">
                    <RedCrescentIcon />
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mt-4">Al Zohor Hospital Portal</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Sign in to access your dashboard</p>
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
                        <div className="flex items-center p-3 bg-red-100/90 border border-red-200 text-red-700 text-sm rounded-md" role="alert">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 flex-shrink-0">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <span>{generalError}</span>
                        </div>
                    )}
                    
                    <button type="submit" className={buttonClasses} disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
};
