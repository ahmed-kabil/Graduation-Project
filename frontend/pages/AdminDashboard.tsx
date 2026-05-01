

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { ProfilePage } from '../components/ProfilePage';
import { Doctor, Nurse, Receptionist, Role } from '../types';
import { api } from '../services/mockApi';
import { useNotification } from '../context/NotificationContext';

// Icons
const StaffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

type StaffFormData = {
  id: string;
  name: string;
  age?: number;
  gender: 'male' | 'female';
  email: string;
  role: Role.Doctor | Role.Nurse | Role.Receptionist;
};

const initialFormState: StaffFormData = {
    id: '',
    name: '',
    age: undefined,
    gender: 'male',
    email: '',
    role: Role.Doctor,
};

const StaffForm: React.FC<{ onSave: () => void; }> = ({ onSave }) => {
    const [formData, setFormData] = useState<StaffFormData>(initialFormState);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useNotification();
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'age' ? (value === '' ? undefined : parseInt(value)) : value 
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.addStaffMember(formData);
            addToast('Staff member added successfully!', 'success');
            onSave();
            setFormData(initialFormState); // Reset form
        } catch (error: any) {
            console.error("Failed to add staff member", error);
            const message = error?.message || 'Failed to add staff member. Please try again.';
            addToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm shadow-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40";

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Add New Staff Member</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Staff ID</label><input type="text" name="id" value={formData.id} onChange={handleChange} className={inputClasses} required /></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} required /></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label><input type="number" name="age" value={formData.age || ''} onChange={handleChange} min="0" max="120" className={inputClasses} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label><select name="gender" value={formData.gender} onChange={handleChange} className={inputClasses} required><option value="male">Male</option><option value="female">Female</option></select></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClasses} required /></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label><select name="role" value={formData.role} onChange={handleChange} className={inputClasses} required><option value={Role.Doctor}>Doctor</option><option value={Role.Nurse}>Nurse</option><option value={Role.Receptionist}>Receptionist</option></select></div>
                </div>
                <div className="pt-2 flex justify-end">
                    <button type="submit" disabled={isLoading} className="flex items-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 transition-all">
                        <AddIcon/> {isLoading ? 'Adding...' : 'Add Staff'}
                    </button>
                </div>
            </form>
        </div>
    );
};

type EditStaffFormData = {
  name: string;
  age?: number;
  gender: 'male' | 'female';
  email: string;
};

const EditStaffModal: React.FC<{
    staff: (Doctor | Nurse | Receptionist) | null;
    onClose: () => void;
    onSave: () => void;
}> = ({ staff, onClose, onSave }) => {
    const [formData, setFormData] = useState<EditStaffFormData>({ name: '', gender: 'male', email: '' });
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useNotification();

    useEffect(() => {
        if (staff) {
            setFormData({
                name: staff.name || '',
                age: staff.age,
                gender: (staff.gender as 'male' | 'female') || 'male',
                email: staff.email || '',
            });
        }
    }, [staff]);

    if (!staff) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'age' ? (value === '' ? undefined : parseInt(value)) : value,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.updateStaffMember(staff.id, formData);
            addToast(`Staff member ${formData.name} updated successfully!`, 'success');
            onSave();
            onClose();
        } catch (error: any) {
            console.error("Failed to update staff member", error);
            const message = error?.message || 'Failed to update staff member.';
            addToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm shadow-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40";

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-staff-title">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700/50 transform transition-all animate-fade-in-scale">
                <style>{`
                    @keyframes fade-in-scale {
                        from { transform: scale(0.95); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    .animate-fade-in-scale { animation: fade-in-scale 0.2s forwards cubic-bezier(0.16, 1, 0.3, 1); }
                `}</style>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 id="edit-staff-title" className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Edit Staff Member</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">ID: <span className="font-mono">{staff.id}</span> &middot; Role: <span className="capitalize">{staff.role}</span></p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                                    <input type="number" name="age" value={formData.age || ''} onChange={handleChange} min="0" max="120" className={inputClasses} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className={inputClasses} required>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClasses} required />
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-slate-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 transition-all">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const AdminDashboard: React.FC = () => {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [nurses, setNurses] = useState<Nurse[]>([]);
    const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
    const [activeTab, setActiveTab] = useState('Staff Management');
    const { addToast } = useNotification();
    const [staffToDelete, setStaffToDelete] = useState<(Doctor | Nurse | Receptionist) | null>(null);
    const [staffToEdit, setStaffToEdit] = useState<(Doctor | Nurse | Receptionist) | null>(null);

    const fetchData = useCallback(() => {
        api.getAllDoctors().then(setDoctors);
        api.getAllNurses().then(setNurses);
        api.getAllReceptionists().then(setReceptionists);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteClick = (staffMember: Doctor | Nurse | Receptionist) => {
        setStaffToDelete(staffMember);
    };

    const handleConfirmDelete = async () => {
        if (!staffToDelete) return;

        try {
            // FIX: The deleteStaffMember API call only takes one argument (staffId).
            await api.deleteStaffMember(staffToDelete.id);
            addToast(`Staff member ${staffToDelete.name} has been removed.`, 'success');
            setStaffToDelete(null);
            fetchData();
        } catch (error) {
            console.error("Failed to delete staff member", error);
            addToast("Failed to remove staff member.", 'error');
        }
    };

    const handleCancelDelete = () => {
        setStaffToDelete(null);
    };

    const sidebarItems = [
        { name: 'Staff Management', icon: <StaffIcon />, onClick: () => setActiveTab('Staff Management') },
        { name: 'Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>, onClick: () => setActiveTab('Profile') }
    ];

    const StaffList: React.FC<{ 
        title: string; 
        staff: (Doctor | Nurse | Receptionist)[],
        onEdit: (staffMember: Doctor | Nurse | Receptionist) => void;
        onDelete: (staffMember: Doctor | Nurse | Receptionist) => void;
    }> = ({ title, staff, onEdit, onDelete }) => (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{title}</h3>
            <ul className="space-y-2">
                {staff.map(member => (
                    <li key={member.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between items-center group border border-slate-100 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-800/50 transition-colors">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white">{member.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{member.email}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono pt-1">ID: {member.id}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => onEdit(member)}
                                className="text-slate-400 hover:text-blue-500 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                aria-label={`Edit ${member.name}`}
                            >
                                <EditIcon />
                            </button>
                            <button 
                                onClick={() => onDelete(member)}
                                className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                aria-label={`Delete ${member.name}`}
                            >
                               <DeleteIcon />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
    
    const renderStaffManagement = () => (
        <div className="space-y-6">
            <StaffForm onSave={fetchData} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <StaffList title="Doctors" staff={doctors} onEdit={setStaffToEdit} onDelete={handleDeleteClick} />
                <StaffList title="Nurses" staff={nurses} onEdit={setStaffToEdit} onDelete={handleDeleteClick} />
                <StaffList title="Receptionists" staff={receptionists} onEdit={setStaffToEdit} onDelete={handleDeleteClick} />
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'Profile':
                return <ProfilePage />;
            case 'Staff Management':
            default:
                return renderStaffManagement();
        }
    };


    return (
        <Layout sidebarItems={sidebarItems} activeItem={activeTab}>
            {renderContent()}
            {staffToDelete && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    aria-labelledby="delete-staff-title"
                    role="dialog"
                    aria-modal="true"
                >
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 dark:border-slate-700/50 transform transition-all animate-fade-in-scale">
                    <style>{`
                        @keyframes fade-in-scale {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        .animate-fade-in-scale { animation: fade-in-scale 0.2s forwards cubic-bezier(0.16, 1, 0.3, 1); }
                    `}</style>
                    <div className="p-6">
                        <h3 id="delete-staff-title" className="text-lg font-semibold text-slate-900 dark:text-white">Confirm Deletion</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Are you sure you want to remove <strong>{staffToDelete.name}</strong> from the system? This action cannot be undone.
                        </p>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-slate-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                        <button
                            type="button"
                            onClick={handleCancelDelete}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                  </div>
                </div>
            )}
            <EditStaffModal
                staff={staffToEdit}
                onClose={() => setStaffToEdit(null)}
                onSave={fetchData}
            />
        </Layout>
    );
};