import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { updatePassword } from '../services/adminApi';
import Swal from 'sweetalert2';
import './Settings.css';

const Settings = () => {
    const { token, admin } = useAdmin();
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({
        current_password: '',
        password: '',
        password_confirmation: ''
    });

    const handleChange = (e) => {
        setPasswords({
            ...passwords,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (passwords.password !== passwords.password_confirmation) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'New passwords do not match'
            });
            return;
        }

        setLoading(true);
        try {
            await updatePassword(token, passwords);
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Password updated successfully'
            });
            setPasswords({
                current_password: '',
                password: '',
                password_confirmation: ''
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to update password'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-container">
            <div className="settings-card">
                <div className="profile-summary">
                    <div className="profile-avatar">
                        {admin?.first_name?.charAt(0)}{admin?.last_name?.charAt(0)}
                    </div>
                    <div className="profile-info">
                        <h3>{admin?.first_name} {admin?.last_name}</h3>
                        <span className="role-badge">{admin?.role?.replace('_', ' ')}</span>
                        <p className="profile-email">{admin?.email}</p>
                    </div>
                </div>

                <div className="settings-section">
                    <div className="section-header">
                        <span className="material-icons">lock</span>
                        <h2>Change Password</h2>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="settings-form">
                        <div className="form-group">
                            <label htmlFor="current_password">Current Password</label>
                            <input
                                type="password"
                                id="current_password"
                                name="current_password"
                                value={passwords.current_password}
                                onChange={handleChange}
                                required
                                placeholder="Enter current password"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="password">New Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={passwords.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter new password"
                                    minLength="8"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password_confirmation">Confirm New Password</label>
                                <input
                                    type="password"
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    value={passwords.password_confirmation}
                                    onChange={handleChange}
                                    required
                                    placeholder="Repeat new password"
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="save-btn" disabled={loading}>
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;
