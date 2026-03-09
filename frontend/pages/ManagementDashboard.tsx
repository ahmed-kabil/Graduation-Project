import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { AnalyticsData } from '../types';
import { api } from '../services/mockApi';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Icons
const AnalyticsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></svg>;

const GENDER_COLORS = ['#38bdf8', '#f472b6', '#a78bfa']; // Sky, Pink, Violet
const CASE_COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#c084fc']; // Emerald, Amber, Blue, Purple

const ChartCard: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{title}</h3>
        {children}
    </div>
);

export const ManagementDashboard: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        api.getAnalytics().then(setData);
    }, []);

    const sidebarItems = [
        { name: 'Analytics', icon: <AnalyticsIcon />, onClick: () => {} },
    ];
    
    const isDark = document.documentElement.classList.contains('dark');
    const tickColor = isDark ? '#94a3b8' : '#6b7280';
    const tooltipStyles = {
        contentStyle: { 
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        },
        labelStyle: { color: isDark ? '#f1f5f9' : '#1e293b' }
    };


    if (!data) {
        return (
            <Layout sidebarItems={sidebarItems} activeItem="Analytics">
                <div>Loading analytics...</div>
            </Layout>
        );
    }
    
    return (
        <Layout sidebarItems={sidebarItems} activeItem="Analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Total Patient Count" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.totalPatients}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'}/>
                            <XAxis dataKey="month" tick={{ fill: tickColor }} />
                            <YAxis tick={{ fill: tickColor }}/>
                            <Tooltip {...tooltipStyles} />
                            <Legend wrapperStyle={{ color: tickColor }} />
                            <Line type="monotone" dataKey="count" name="Patients" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Alert Statistics (Last Week)">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.alertStatistics}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'}/>
                            <XAxis dataKey="day" tick={{ fill: tickColor }}/>
                            <YAxis tick={{ fill: tickColor }}/>
                            <Tooltip {...tooltipStyles} />
                            <Legend wrapperStyle={{ color: tickColor }} />
                            <Bar dataKey="count" name="Alerts" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Gender Distribution">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={data.genderDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label={{ fill: tickColor }}>
                                {data.genderDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip {...tooltipStyles} />
                            <Legend wrapperStyle={{ color: tickColor }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </Layout>
    );
};