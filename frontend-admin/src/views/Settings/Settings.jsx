import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { updatePassword, fetchAppSettings, updateAppSetting } from '../../services/adminApi';
import Swal from 'sweetalert2';
import './Settings.css';

const Settings = () => {
    const { token, admin } = useAdmin();
    const [loading, setLoading] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [passwords, setPasswords] = useState({
        current_password: '',
        password: '',
        password_confirmation: ''
    });
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    // Check if user is super admin
    const isSuperAdmin = admin?.role === 'super_admin';

    // Load app settings (Super Admin only)
    useEffect(() => {
        const loadSettings = async () => {
            if (!token || !isSuperAdmin) return;
            try {
                setLoadingSettings(true);
                const result = await fetchAppSettings(token);
                if (result.settings && typeof result.settings === 'object') {
                    setMaintenanceMode(result.settings.maintenance_mode || false);
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoadingSettings(false);
            }
        };

        loadSettings();
    }, [token, isSuperAdmin]);

    const handleChange = (e) => {
        setPasswords({
            ...passwords,
            [e.target.name]: e.target.value
        });
    };

    const handleMaintenanceModeToggle = async (e) => {
        const newValue = e.target.checked;
        setMaintenanceMode(newValue);

        try {
            await updateAppSetting(token, 'maintenance_mode', newValue, 'boolean');
            window.dispatchEvent(new CustomEvent('maintenance-mode-updated', {
                detail: {
                    key: 'maintenance_mode',
                    value: newValue,
                },
            }));
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: `Maintenance mode has been ${newValue ? 'enabled' : 'disabled'}`
            });
        } catch (error) {
            // Revert the toggle if the API call fails
            setMaintenanceMode(!newValue);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to update maintenance mode'
            });
        }
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

                {/* App Settings Section - Only visible to Super Admin */}
                {isSuperAdmin ? (
                    <div className="settings-section">
                        <div className="section-header">
                            <span className="material-icons">tune</span>
                            <h2>App Settings</h2>
                        </div>

                        <div className="app-settings-form">
                            <div className="settings-item">
                                <div className="setting-info">
                                    <h3>Maintenance Mode</h3>
                                    <p>When enabled, all users will see a "Coming Soon" screen after login instead of the main app</p>
                                </div>
                                <div className="setting-control">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={maintenanceMode}
                                            onChange={handleMaintenanceModeToggle}
                                            disabled={loadingSettings}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <span className="toggle-status">
                                        {maintenanceMode ? 'ENABLED' : 'DISABLED'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Change Password Section */}
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

