
import React, { useState, FormEvent, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

/* ─── Reusable NABD Hospital Logo (heart + ECG heartbeat line) ─── */
export const NABDLogo: React.FC<{ size?: 'sm' | 'md' | 'lg'; showText?: boolean }> = ({ size = 'lg', showText = true }) => {
    const dims = size === 'sm' ? 32 : size === 'md' ? 44 : 64;
    return (
        <div className="flex flex-col items-center gap-1">
            <svg width={dims} height={dims} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Heart shape */}
                <path d="M40 70 C40 70 8 48 8 28 C8 16 17 8 28 8 C33.5 8 38 10.5 40 14 C42 10.5 46.5 8 52 8 C63 8 72 16 72 28 C72 48 40 70 40 70Z"
                    fill="url(#heartGrad)" stroke="none" />
                {/* ECG heartbeat line across heart */}
                <polyline points="12,40 26,40 30,40 34,32 38,50 42,28 46,46 50,36 54,40 68,40"
                    fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id="heartGrad" x1="8" y1="8" x2="72" y2="70" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#0ea5e9" />
                        <stop offset="50%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                </defs>
            </svg>
            {showText && (
                <div className="text-center leading-tight select-none">
                    <span className="block text-xl font-extrabold tracking-wide" style={{ color: '#0d9488' }}>NABD</span>
                    <span className="block text-[10px] font-semibold tracking-[0.25em] text-slate-500" style={{ marginTop: '-2px' }}>HOSPITAL</span>
                </div>
            )}
        </div>
    );
};

/* ─── Icon helpers ─── */
const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
        <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,7 12,13 2,7" />
    </svg>
);
const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);
const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

/* ─── Hospital Background Scene (CSS/SVG-generated) ─── */
const HospitalBackground: React.FC = () => {
    // Generate deterministic sparkle particles
    const particles = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 13) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        size: 2 + (i % 4),
        delay: (i * 0.4) % 6,
        duration: 3 + (i % 4),
    })), []);

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Base gradient — cool medical blues */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-teal-50" />

            {/* Hospital corridor scene — SVG illustration */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.18]" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                {/* Building exterior left */}
                <rect x="0" y="100" width="380" height="800" rx="4" fill="#94a3b8" />
                <rect x="20" y="140" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.7" />
                <rect x="100" y="140" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.5" />
                <rect x="180" y="140" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.6" />
                <rect x="260" y="140" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.4" />
                <rect x="20" y="260" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.5" />
                <rect x="100" y="260" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.7" />
                <rect x="180" y="260" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.4" />
                <rect x="260" y="260" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.6" />
                <rect x="20" y="380" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.6" />
                <rect x="100" y="380" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.4" />
                <rect x="180" y="380" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.7" />
                <rect x="260" y="380" width="60" height="80" rx="4" fill="#bfdbfe" opacity="0.5" />
                {/* Medical cross on building */}
                <rect x="155" y="60" width="50" height="16" rx="2" fill="#0ea5e9" opacity="0.6" />
                <rect x="172" y="44" width="16" height="50" rx="2" fill="#0ea5e9" opacity="0.6" />

                {/* Building exterior right */}
                <rect x="1220" y="50" width="380" height="850" rx="4" fill="#94a3b8" />
                <rect x="1240" y="100" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.5" />
                <rect x="1310" y="100" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.7" />
                <rect x="1380" y="100" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.4" />
                <rect x="1450" y="100" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.6" />
                <rect x="1240" y="210" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.7" />
                <rect x="1310" y="210" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.5" />
                <rect x="1380" y="210" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.6" />
                <rect x="1450" y="210" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.4" />
                <rect x="1240" y="320" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.4" />
                <rect x="1310" y="320" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.6" />
                <rect x="1380" y="320" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.7" />
                <rect x="1450" y="320" width="50" height="70" rx="4" fill="#bfdbfe" opacity="0.5" />

                {/* Corridor / floor */}
                <polygon points="380,900 1220,900 1100,500 500,500" fill="#cbd5e1" opacity="0.5" />
                <line x1="380" y1="900" x2="500" y2="500" stroke="#94a3b8" strokeWidth="1" opacity="0.4" />
                <line x1="1220" y1="900" x2="1100" y2="500" stroke="#94a3b8" strokeWidth="1" opacity="0.4" />

                {/* Ceiling strip */}
                <rect x="500" y="490" width="600" height="12" rx="2" fill="#e2e8f0" opacity="0.6" />
                {/* Ceiling lights */}
                <rect x="580" y="494" width="80" height="4" rx="2" fill="#fef9c3" opacity="0.8" />
                <rect x="760" y="494" width="80" height="4" rx="2" fill="#fef9c3" opacity="0.8" />
                <rect x="940" y="494" width="80" height="4" rx="2" fill="#fef9c3" opacity="0.8" />

                {/* Person silhouettes — doctors / nurses */}
                {/* Doctor left */}
                <g opacity="0.35" transform="translate(440, 520)">
                    <circle cx="20" cy="10" r="12" fill="#64748b" />
                    <rect x="6" y="24" width="28" height="60" rx="6" fill="#f8fafc" />
                    <rect x="10" y="84" width="8" height="40" rx="3" fill="#64748b" />
                    <rect x="24" y="84" width="8" height="40" rx="3" fill="#64748b" />
                </g>
                {/* Nurse right */}
                <g opacity="0.3" transform="translate(1020, 540)">
                    <circle cx="18" cy="10" r="11" fill="#64748b" />
                    <rect x="5" y="22" width="26" height="55" rx="6" fill="#bfdbfe" />
                    <rect x="8" y="77" width="8" height="36" rx="3" fill="#64748b" />
                    <rect x="22" y="77" width="8" height="36" rx="3" fill="#64748b" />
                </g>
                {/* Two people walking mid-left */}
                <g opacity="0.25" transform="translate(540, 560)">
                    <circle cx="16" cy="8" r="10" fill="#64748b" />
                    <rect x="4" y="20" width="24" height="50" rx="5" fill="#f8fafc" />
                    <rect x="7" y="70" width="7" height="34" rx="3" fill="#475569" />
                    <rect x="18" y="70" width="7" height="34" rx="3" fill="#475569" />
                </g>
                <g opacity="0.2" transform="translate(580, 570)">
                    <circle cx="16" cy="8" r="10" fill="#64748b" />
                    <rect x="4" y="20" width="24" height="48" rx="5" fill="#93c5fd" />
                    <rect x="7" y="68" width="7" height="32" rx="3" fill="#475569" />
                    <rect x="18" y="68" width="7" height="32" rx="3" fill="#475569" />
                </g>
                {/* Doctor right side */}
                <g opacity="0.28" transform="translate(950, 550)">
                    <circle cx="18" cy="10" r="11" fill="#64748b" />
                    <rect x="5" y="22" width="26" height="55" rx="6" fill="#f8fafc" />
                    <rect x="8" y="77" width="8" height="36" rx="3" fill="#475569" />
                    <rect x="22" y="77" width="8" height="36" rx="3" fill="#475569" />
                    {/* Stethoscope hint */}
                    <circle cx="18" cy="38" r="4" stroke="#0ea5e9" strokeWidth="1.5" fill="none" opacity="0.6" />
                </g>

                {/* Medical equipment — monitor right wall */}
                <g opacity="0.3" transform="translate(1130, 530)">
                    <rect x="0" y="0" width="50" height="40" rx="4" fill="#334155" />
                    <rect x="4" y="4" width="42" height="28" rx="2" fill="#0f172a" />
                    {/* ECG line on monitor */}
                    <polyline points="8,20 14,20 17,12 20,26 23,16 26,22 30,20 42,20" stroke="#22d3ee" strokeWidth="1.5" fill="none" />
                    <rect x="18" y="40" width="14" height="20" rx="1" fill="#64748b" />
                </g>

                {/* Medical equipment — IV stand left */}
                <g opacity="0.2" transform="translate(420, 560)">
                    <line x1="10" y1="0" x2="10" y2="100" stroke="#94a3b8" strokeWidth="2" />
                    <rect x="2" y="0" width="16" height="12" rx="2" fill="#94a3b8" />
                    <circle cx="10" cy="100" r="6" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                </g>

                {/* Subtle door frames along corridor */}
                <rect x="500" y="520" width="45" height="80" rx="2" fill="#e2e8f0" opacity="0.4" />
                <rect x="620" y="530" width="40" height="70" rx="2" fill="#e2e8f0" opacity="0.3" />
                <rect x="940" y="530" width="40" height="70" rx="2" fill="#e2e8f0" opacity="0.3" />
                <rect x="1060" y="520" width="45" height="80" rx="2" fill="#e2e8f0" opacity="0.4" />
            </svg>

            {/* Depth-of-field blur overlay */}
            <div className="absolute inset-0" style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />

            {/* Soft radial light from center (spotlight on card area) */}
            <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(255,255,255,0.7) 0%, rgba(241,245,249,0.4) 50%, rgba(186,210,235,0.3) 100%)'
            }} />

            {/* Floating sparkle particles */}
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full bg-white/60 login-sparkle"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                    }}
                />
            ))}

            {/* Subtle teal/blue gradient bars — top & bottom */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 via-teal-400 to-sky-400 opacity-60" />
            <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-teal-400 via-sky-400 to-teal-400 opacity-40" />
        </div>
    );
};

/* ─── Login Page Component ─── */
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
        const errors: { email?: string; password?: string } = {};
        if (!email.trim() && !password.trim()) {
            errors.email = 'Please enter email and password';
            errors.password = ' ';
            setLocalErrors(errors);
            return;
        }
        if (!email.trim()) { errors.email = 'Please enter your email'; setLocalErrors(errors); return; }
        if (!password.trim()) { errors.password = 'Please enter your password'; setLocalErrors(errors); return; }
        setLocalErrors({});
        await login(email, password);
    };

    const emailHasError = !!localErrors.email || (!!error && (errorField === 'email' || errorField === null));
    const passwordHasError = !!localErrors.password || (!!error && (errorField === 'password' || errorField === null));
    const emailErrorMsg = localErrors.email || (error && errorField === 'email' ? error : null);
    const passwordErrorMsg = (localErrors.password && localErrors.password.trim()) ? localErrors.password : (error && errorField === 'password' ? error : null);
    const generalError = error && !errorField && !Object.keys(localErrors).length ? error : null;

    const inputBase = "w-full pl-11 pr-4 py-3.5 text-slate-700 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-sm placeholder:text-slate-400";
    const normalBorder = "border-slate-200 focus:ring-teal-500/30 focus:border-teal-500 hover:border-slate-300";
    const errorBorder = "border-red-400 focus:ring-red-500/30 focus:border-red-400 bg-red-50/60";

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Full-screen hospital background */}
            <HospitalBackground />

            {/* Login card */}
            <div className="relative z-10 w-full max-w-[420px] bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-slate-300/40 border border-white/80 login-card-enter">
                <div className="px-8 pt-8 pb-2">
                    {/* NABD Logo */}
                    <div className="flex justify-center mb-5">
                        <NABDLogo size="lg" showText={true} />
                    </div>

                    {/* Title */}
                    <h1 className="text-center text-xl font-bold text-slate-800 tracking-tight">NABD Medical Portal</h1>
                    <p className="text-center text-sm text-slate-500 mt-1 mb-6">Please Sign In to Your Account</p>
                </div>

                <form onSubmit={handleLogin} noValidate className="px-8 pb-8 space-y-4">
                    {/* Email Address */}
                    <div>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><MailIcon /></span>
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={handleEmailChange}
                                className={`${inputBase} ${emailHasError ? errorBorder : normalBorder}`}
                                autoComplete="email"
                            />
                        </div>
                        {emailErrorMsg && (
                            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                                <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {emailErrorMsg}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><LockIcon /></span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={handlePasswordChange}
                                className={`${inputBase} pr-11 ${passwordHasError ? errorBorder : normalBorder}`}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        {passwordErrorMsg && (
                            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                                <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {passwordErrorMsg}
                            </p>
                        )}
                    </div>

                    {/* General error */}
                    {generalError && (
                        <div className="flex items-center p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl" role="alert">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 flex-shrink-0">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>{generalError}</span>
                        </div>
                    )}

                    {/* Log In Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-4 font-semibold text-white text-sm bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 rounded-xl hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-600/40 hover:translate-y-[-1px] active:translate-y-0"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                Signing In...
                            </span>
                        ) : 'Log In'}
                    </button>
                </form>
            </div>
        </div>
    );
};
