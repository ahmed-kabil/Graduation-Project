

import React, { useState, useEffect } from 'react';
import { Patient, VitalSign, VitalHistoryPoint } from '../types';
import { useVitals } from '../hooks/useVitals';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Icons — animated, matching PatientDashboard style
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-rose-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const TempIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-amber-500 animate-pulse"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></svg>;
const RespirationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-blue-500 animate-pulse"><path d="M3 12h6l3-9 3 18 3-9h6"/></svg>;
const O2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-emerald-500 animate-pulse"><path d="M12.25 21.16a10.05 10.05 0 0 1-5.18-1.74 2.43 2.43 0 0 1-1.33-2.18l-1.2-6.52a2.43 2.43 0 0 1 .53-2.17 10.05 10.05 0 0 1 14.86 6.31 2.43 2.43 0 0 1-2.17 2.72l-6.52 1.2a2.43 2.43 0 0 1-.99.28z"/><path d="M22 2S15 2 12 5"/><path d="M2 22s7 0 10-3"/></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-indigo-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const GenderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-pink-500"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path><path d="M12 11.25V16.5"></path><path d="M12 8.25V6"></path><path d="M9.75 14.25h4.5"></path></svg>;
const DeviceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-slate-500 dark:text-slate-400"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>;

const VitalsCard: React.FC<{ vital: VitalSign }> = ({ vital }) => {
    const icons = {
        'Heart Rate': <HeartIcon/>,
        'Temperature': <TempIcon/>,
        'Respiration Rate': <RespirationIcon/>,
        'SpO2': <O2Icon/>,
    };
    const isOutOfRange = vital.thresholds && (vital.value < vital.thresholds.min || vital.value > vital.thresholds.max);

    return (
        <div className={`bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-card card-hover border ${isOutOfRange ? 'border border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.9)] bg-red-200 dark:bg-red-900/40 animate-pulse' : 'border-slate-100 dark:border-slate-700/50'}`}>
            <div className="flex items-center justify-between mb-3">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{vital.name}</p>
                <div className="opacity-80">{icons[vital.name]}</div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{vital.value} <span className="text-base font-normal text-slate-400 dark:text-slate-500">{vital.unit}</span></p>
        </div>
    )
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length > 0) {
    const dataPoint = payload[0].payload;
    
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
        <p className="label text-sm font-bold text-slate-800 dark:text-white mb-1">{`Time: ${dataPoint.time || label}`}</p>
        <p style={{ color: '#ef4444' }} className="text-sm font-medium">
          {`Heart Rate: ${dataPoint.heartRate?.toFixed(1) || '0.0'} BPM`}
        </p>
        <p style={{ color: '#f59e0b' }} className="text-sm font-medium">
          {`Temperature: ${dataPoint.temperature?.toFixed(1) || '0.0'} °C`}
        </p>
        <p style={{ color: '#3b82f6' }} className="text-sm font-medium">
          {`Respiration Rate: ${dataPoint.respirationRate?.toFixed(1) || '0.0'} breaths/min`}
        </p>
        <p style={{ color: '#10b981' }} className="text-sm font-medium">
          {`SpO2: ${dataPoint.spo2?.toFixed(1) || '0.0'} %`}
        </p>
      </div>
    );
  }
  return null;
};

export const PatientDetailView: React.FC<{ patient: Patient; onBack: () => void; }> = ({ patient, onBack }) => {
    const { vitals, history } = useVitals(patient);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const chartData: Record<VitalSign['name'], VitalHistoryPoint[]> = history;
    
    // Merge all vitals data by time for synchronized tooltip display
    const mergedChartData = chartData['Heart Rate']?.map((point, index) => ({
        time: point.time,
        heartRate: chartData['Heart Rate'][index]?.value || 0,
        temperature: chartData['Temperature'][index]?.value || 0,
        respirationRate: chartData['Respiration Rate'][index]?.value || 0,
        spo2: chartData['SpO2'][index]?.value || 0,
    })) || [];

    const healthStatus = vitals.every(v => v.thresholds && v.value >= v.thresholds.min && v.value <= v.thresholds.max)
        ? "All vitals are within the normal range."
        : "Some vitals are outside the normal range. Immediate attention may be required.";
    const statusColor = healthStatus.includes("normal") ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Monitoring: {patient.name}</h2>
                <button onClick={onBack} className="px-4 py-2.5 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition w-full sm:w-auto">
                    &larr; Back to Patient List
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 border-l-4 border-l-blue-500">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Patient Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-full"><CalendarIcon /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Age</p>
                            <p className="text-xl font-semibold text-slate-800 dark:text-white">{patient.age}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-pink-100 dark:bg-pink-900/30 p-3 rounded-full"><GenderIcon /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gender</p>
                            <p className="text-xl font-semibold text-slate-800 dark:text-white">{patient.gender}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full"><DeviceIcon /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Device ID</p>
                            <p className="text-xl font-semibold text-slate-800 dark:text-white font-mono">{patient.deviceId}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`p-4 rounded-xl flex items-center text-sm font-medium border ${statusColor}`}>
                <CheckCircleIcon />
                <p>{healthStatus}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {vitals.map(v => <VitalsCard key={v.name} vital={v} />)}
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Vitals History (Last 20 Readings)</h3>
                 <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={mergedChartData} margin={isMobile ? { top: 5, right: 5, left: -25, bottom: 0 } : { top: 5, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorHeartRate2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorTemperature2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRespirationRate2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorSpO22" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="stroke-slate-300" vertical={false}/>
                        <XAxis 
                            dataKey="time" 
                            stroke="#64748b"
                            tick={{ fontSize: isMobile ? 10 : 12, fill: 'currentColor' }} 
                            className="text-slate-600 dark:text-slate-400"
                            tickLine={false}
                            interval={isMobile ? 'preserveEnd' : 'preserveStartEnd'}
                        />
                        <YAxis yAxisId="left" stroke="#64748b" domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" domain={[90, 100]} tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} animationDuration={200} isAnimationActive={false} />
                        {!isMobile && <Legend wrapperStyle={{ color: 'var(--text-color)' }} />}
                        <Area yAxisId="left" type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#ef4444" fillOpacity={1} fill="url(#colorHeartRate2)" strokeWidth={2} activeDot={{ r: 6 }} dot={false} connectNulls />
                        <Area yAxisId="left" type="monotone" dataKey="temperature" name="Temperature" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTemperature2)" strokeWidth={2} activeDot={{ r: 6 }} dot={false} connectNulls />
                        <Area yAxisId="left" type="monotone" dataKey="respirationRate" name="Respiration Rate" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRespirationRate2)" strokeWidth={2} activeDot={{ r: 6 }} dot={false} connectNulls />
                        <Area yAxisId="right" type="monotone" dataKey="spo2" name="SpO2" stroke="#10b981" fillOpacity={1} fill="url(#colorSpO22)" strokeWidth={2} activeDot={{ r: 6 }} dot={false} connectNulls />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};