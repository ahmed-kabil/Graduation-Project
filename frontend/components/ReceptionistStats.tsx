import React, { useState, useEffect } from 'react';
import { Patient, Doctor } from '../types';
import { api } from '../services/mockApi';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';

// --- TypeScript Interfaces ---
interface GenderData {
    name: string;
    value: number;
    [key: string]: string | number;
}

interface DoctorPatientCount {
    name: string;
    patients: number;
    [key: string]: string | number;
}

// --- Colors ---
const GENDER_COLORS = ['#3b82f6', '#ec4899']; // Blue for Male, Pink for Female
const BAR_COLOR = '#6366f1'; // Indigo

// --- Icons ---
const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const MaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="14" r="5" />
        <line x1="19" y1="5" x2="13.6" y2="10.4" />
        <polyline points="19 5 19 10" />
        <polyline points="14 5 19 5" />
    </svg>
);

const FemaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="5" />
        <line x1="12" y1="14" x2="12" y2="22" />
        <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
);

const DoctorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="12" y1="6" x2="12" y2="12" />
        <line x1="9" y1="9" x2="15" y2="9" />
    </svg>
);

// --- Custom Tooltip for Pie Chart ---
const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>
                    {payload[0].name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Count: <span className="font-semibold text-slate-800 dark:text-white">{payload[0].value}</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Percentage: <span className="font-semibold text-slate-800 dark:text-white">{(payload[0].percent * 100).toFixed(1)}%</span>
                </p>
            </div>
        );
    }
    return null;
};

// --- Custom Tooltip for Bar Chart ---
const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{label}</p>
                <p className="text-sm text-indigo-600 font-medium">
                    Patients: {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

// --- Custom Pie Label ---
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

// --- Main Component ---
export const ReceptionistStats: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [patientsData, doctorsData] = await Promise.all([
                    api.getAllPatients(),
                    api.getAllDoctors(),
                ]);
                setPatients(patientsData);
                setDoctors(doctorsData);
            } catch (error) {
                console.error('Failed to fetch statistics data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Compute Gender Distribution ---
    const genderData: GenderData[] = (() => {
        const maleCount = patients.filter(p => p.gender?.toLowerCase() === 'male').length;
        const femaleCount = patients.filter(p => p.gender?.toLowerCase() === 'female').length;
        return [
            { name: 'Male', value: maleCount },
            { name: 'Female', value: femaleCount },
        ];
    })();

    // --- Compute Top Doctors by Patient Count ---
    const topDoctorsData: DoctorPatientCount[] = (() => {
        const doctorPatientMap: Record<string, number> = {};
        patients.forEach(p => {
            if (p.assignedDoctorId) {
                doctorPatientMap[p.assignedDoctorId] = (doctorPatientMap[p.assignedDoctorId] || 0) + 1;
            }
        });

        return doctors
            .map(d => ({
                name: d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name,
                patients: doctorPatientMap[d.id] || 0,
            }))
            .sort((a, b) => b.patients - a.patients)
            .slice(0, 8);
    })();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    const totalPatients = patients.length;
    const maleCount = genderData.find(g => g.name === 'Male')?.value || 0;
    const femaleCount = genderData.find(g => g.name === 'Female')?.value || 0;

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                {/* Total Patients Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-4 sm:p-6 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Total Patients</p>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mt-1">{totalPatients}</p>
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-full text-blue-600 dark:text-blue-400">
                            <UsersIcon />
                        </div>
                    </div>
                </div>

                {/* Male Patients Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-4 sm:p-6 border-l-4 border-l-sky-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Male Patients</p>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mt-1">{maleCount}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {totalPatients > 0 ? ((maleCount / totalPatients) * 100).toFixed(1) : 0}% of total
                            </p>
                        </div>
                        <div className="bg-sky-100 dark:bg-sky-900/30 p-2 sm:p-3 rounded-full text-sky-600 dark:text-sky-400">
                            <MaleIcon />
                        </div>
                    </div>
                </div>

                {/* Female Patients Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-4 sm:p-6 border-l-4 border-l-pink-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Female Patients</p>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mt-1">{femaleCount}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {totalPatients > 0 ? ((femaleCount / totalPatients) * 100).toFixed(1) : 0}% of total
                            </p>
                        </div>
                        <div className="bg-pink-100 dark:bg-pink-900/30 p-2 sm:p-3 rounded-full text-pink-600 dark:text-pink-400">
                            <FemaleIcon />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Gender Distribution Pie Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white mb-3 sm:mb-4">Gender Distribution</h3>
                    {totalPatients === 0 ? (
                        <div className="flex items-center justify-center h-48 sm:h-64 text-slate-400 text-sm">No patient data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomLabel}
                                    outerRadius={85}
                                    innerRadius={40}
                                    fill="#8884d8"
                                    dataKey="value"
                                    stroke="none"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {genderData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    formatter={(value: string) => (
                                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Top Doctors Bar Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <div className="text-indigo-600"><DoctorIcon /></div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white">Top Doctors by Patient Count</h3>
                    </div>
                    {topDoctorsData.length === 0 ? (
                        <div className="flex items-center justify-center h-48 sm:h-64 text-slate-400 text-sm">No doctor data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart
                                data={topDoctorsData}
                                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                                barCategoryGap="20%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    interval={0}
                                    angle={-30}
                                    textAnchor="end"
                                    height={50}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<BarTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                <Bar
                                    dataKey="patients"
                                    fill={BAR_COLOR}
                                    radius={[6, 6, 0, 0]}
                                    animationDuration={800}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};
