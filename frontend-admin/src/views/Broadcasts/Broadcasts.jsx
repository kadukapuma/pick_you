import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext';
import {
    fetchAppRelease,
    publishAppUpdate,
    uploadAppApk,
    sendBulkNotification,
    fetchBroadcastNotifications,
    deleteBroadcastNotification,
    clearBroadcastNotifications
} from '../../services/adminApi';
import Swal from 'sweetalert2';
import Modal from '../../components/Modal/Modal';
import './Broadcasts.css';

const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return isoString;
    }
};

const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '...';
    if (seconds < 1) return '< 1s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
};

const formatTimeAgo = (isoString) => {
    if (!isoString) return '';
    try {
        const now = new Date();
        const past = new Date(isoString);
        const diffSeconds = Math.floor((now - past) / 1000);

        if (diffSeconds < 60) return 'Just now';
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) return `${diffDays}d ago`;
        return formatDateTime(isoString);
    } catch {
        return '';
    }
};

const Broadcasts = () => {
    const { token } = useAdmin();
    const [loadingDriver, setLoadingDriver] = useState(false);
    const [loadingPassenger, setLoadingPassenger] = useState(false);
    const [loadingUpdate, setLoadingUpdate] = useState(false);
    const [loadingApk, setLoadingApk] = useState(false);
    const [apkUploadStats, setApkUploadStats] = useState({ percent: 0, loaded: 0, total: 0, speedBps: 0, etaSeconds: null });
    const [apkFile, setApkFile] = useState(null);
    const uploadStartRef = useRef(null);
    const [activeRelease, setActiveRelease] = useState(null);
    const [updateForm, setUpdateForm] = useState({
        app: 'passenger',
        latest_version: '1.1.0',
        minimum_version: '1.1.0',
        title: 'Update',
        message: 'Download the new updated app from our website.',
    });

    useEffect(() => {
        fetchAppRelease(token, updateForm.app).then(setActiveRelease).catch(() => setActiveRelease(null));
    }, [token, updateForm.app]);

    // Form states
    const [driverForm, setDriverForm] = useState({
        title: '',
        body: ''
    });

    const [passengerForm, setPassengerForm] = useState({
        title: '',
        body: ''
    });

    // Broadcasts history states
    const [broadcasts, setBroadcasts] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage] = useState(8);
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: 8,
        total: 0,
        totalPages: 1,
    });
    const [targetFilter, setTargetFilter] = useState('all_targets');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedBroadcast, setSelectedBroadcast] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch broadcast history
    const loadBroadcasts = useCallback(async () => {
        if (!token) return;
        setLoadingHistory(true);
        try {
            const apiTarget = targetFilter === 'all_targets' ? '' : targetFilter;
            const response = await fetchBroadcastNotifications(token, {
                page,
                perPage,
                target: apiTarget,
                search: debouncedSearch,
            });
            setBroadcasts(response.broadcasts || []);
            if (response.pagination) {
                setPagination(response.pagination);
            }
        } catch (error) {
            console.error('Failed to load broadcasts:', error);
        } finally {
            setLoadingHistory(false);
        }
    }, [token, page, perPage, targetFilter, debouncedSearch]);

    useEffect(() => {
        loadBroadcasts();
    }, [loadBroadcasts]);

    const handleDriverChange = (e) => {
        setDriverForm({
            ...driverForm,
            [e.target.name]: e.target.value
        });
    };

    const handlePassengerChange = (e) => {
        setPassengerForm({
            ...passengerForm,
            [e.target.name]: e.target.value
        });
    };

    const handleUpdateChange = (e) => {
        const next = { ...updateForm, [e.target.name]: e.target.value };
        if (e.target.name === 'app') {
            setActiveRelease(null);
            setApkFile(null);
        }
        setUpdateForm(next);
    };

    const handleUploadApk = async () => {
        if (!apkFile) {
            Swal.fire({ icon: 'warning', title: 'Select an APK', text: 'Choose the signed Android APK before uploading.' });
            return;
        }
        setLoadingApk(true);
        uploadStartRef.current = Date.now();
        setApkUploadStats({ percent: 0, loaded: 0, total: apkFile.size, speedBps: 0, etaSeconds: null });
        try {
            const handleProgress = ({ loaded, total }) => {
                const elapsedSeconds = (Date.now() - uploadStartRef.current) / 1000;
                const speedBps = elapsedSeconds > 0 ? loaded / elapsedSeconds : 0;
                const remaining = total - loaded;
                const etaSeconds = speedBps > 0 ? remaining / speedBps : null;
                setApkUploadStats({
                    percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
                    loaded,
                    total,
                    speedBps,
                    etaSeconds,
                });
            };
            const release = await uploadAppApk(token, updateForm.app, updateForm.latest_version, apkFile, handleProgress);
            setActiveRelease(release);
            setApkFile(null);
            await Swal.fire({ icon: 'success', title: 'APK Uploaded', text: `${release.original_name} is now the active ${updateForm.app} download.` });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Upload Failed', text: error.message || 'The APK could not be uploaded.' });
        } finally {
            setLoadingApk(false);
            setApkUploadStats({ percent: 0, loaded: 0, total: 0, speedBps: 0, etaSeconds: null });
            uploadStartRef.current = null;
        }
    };

    const handlePublishUpdate = async (e) => {
        e.preventDefault();
        const confirm = await Swal.fire({
            title: `Require ${updateForm.app} app update?`,
            text: `Users below version ${updateForm.minimum_version} will be blocked until they open the download page and install the update.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e67e22',
            confirmButtonText: 'Publish required update',
        });
        if (!confirm.isConfirmed) return;

        setLoadingUpdate(true);
        try {
            await publishAppUpdate(token, updateForm.app, { ...updateForm, required: true });
            await Swal.fire({ icon: 'success', title: 'Update Published', text: 'The version policy is active and the push campaign has been scheduled.' });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Publish Failed', text: error.message || 'Failed to publish the app update.' });
        } finally {
            setLoadingUpdate(false);
        }
    };

    const handleSendDrivers = async (e) => {
        e.preventDefault();
        if (!driverForm.title.trim() || !driverForm.body.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Required fields empty',
                text: 'Please fill in both the title and body of the message.'
            });
            return;
        }

        const confirm = await Swal.fire({
            title: 'Send Broadcast to Drivers?',
            text: 'This message will be sent to all drivers in the system as a push notification and in-app message.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#08d612',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Send Now!'
        });

        if (!confirm.isConfirmed) return;

        setLoadingDriver(true);
        try {
            await sendBulkNotification(token, {
                target: 'driver',
                title: driverForm.title,
                body: driverForm.body
            });
            Swal.fire({
                icon: 'success',
                title: 'Broadcast Sent',
                text: 'Bulk campaign scheduled for drivers successfully!',
                timer: 2500,
                showConfirmButton: false,
            });
            setDriverForm({ title: '', body: '' });
            // Refresh history
            loadBroadcasts();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Broadcast Failed',
                text: error.message || 'Failed to schedule campaign.'
            });
        } finally {
            setLoadingDriver(false);
        }
    };

    const handleSendPassengers = async (e) => {
        e.preventDefault();
        if (!passengerForm.title.trim() || !passengerForm.body.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Required fields empty',
                text: 'Please fill in both the title and body of the message.'
            });
            return;
        }

        const confirm = await Swal.fire({
            title: 'Send Broadcast to Passengers?',
            text: 'This message will be sent to all passengers in the system as a push notification and in-app message.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#08d612',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Send Now!'
        });

        if (!confirm.isConfirmed) return;

        setLoadingPassenger(true);
        try {
            await sendBulkNotification(token, {
                target: 'passenger',
                title: passengerForm.title,
                body: passengerForm.body
            });
            Swal.fire({
                icon: 'success',
                title: 'Broadcast Sent',
                text: 'Bulk campaign scheduled for passengers successfully!',
                timer: 2500,
                showConfirmButton: false,
            });
            setPassengerForm({ title: '', body: '' });
            // Refresh history
            loadBroadcasts();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Broadcast Failed',
                text: error.message || 'Failed to schedule campaign.'
            });
        } finally {
            setLoadingPassenger(false);
        }
    };

    const handleDeleteBroadcast = async (broadcast) => {
        const confirm = await Swal.fire({
            title: 'Delete Broadcast Notification?',
            text: `Are you sure you want to delete "${broadcast.title}"? Users will no longer see this notification in their feed.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete Notification'
        });

        if (!confirm.isConfirmed) return;

        setDeletingId(broadcast.id);
        try {
            await deleteBroadcastNotification(token, broadcast.id);
            Swal.fire({
                icon: 'success',
                title: 'Notification Deleted',
                text: 'The broadcast notification has been permanently removed.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            if (selectedBroadcast?.id === broadcast.id) {
                setSelectedBroadcast(null);
            }
            loadBroadcasts();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: error.message || 'Could not delete broadcast notification.'
            });
        } finally {
            setDeletingId(null);
        }
    };

    const handleClearAll = async () => {
        if (pagination.total === 0) return;

        const confirm = await Swal.fire({
            title: 'Clear All Broadcast History?',
            text: 'This will permanently remove all broadcast notifications for all audiences. This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Clear All'
        });

        if (!confirm.isConfirmed) return;

        try {
            await clearBroadcastNotifications(token);
            Swal.fire({
                icon: 'success',
                title: 'History Cleared',
                text: 'All broadcast notifications have been deleted.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            loadBroadcasts();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Clear Failed',
                text: error.message || 'Failed to clear broadcast history.'
            });
        }
    };

    const renderAudienceBadge = (target) => {
        switch (target) {
            case 'driver':
                return (
                    <span className="audience-badge badge-driver">
                        <span className="material-icons">directions_car</span> Drivers
                    </span>
                );
            case 'passenger':
                return (
                    <span className="audience-badge badge-passenger">
                        <span className="material-icons">person_outline</span> Passengers
                    </span>
                );
            case 'all':
            default:
                return (
                    <span className="audience-badge badge-all">
                        <span className="material-icons">groups</span> All Users
                    </span>
                );
        }
    };

    const totalPages = pagination.totalPages || 1;
    const getVisiblePages = () => {
        const pages = [];
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages, page + 2);
        for (let current = start; current <= end; current += 1) {
            pages.push(current);
        }
        return pages;
    };

    return (
        <div className="broadcasts-container">
            {/* Header section */}
            <div className="broadcasts-header-section">
                <span className="material-icons broadcast-icon-large">campaign</span>
                <div className="broadcasts-intro">
                    <h2>Push Notification Campaigns</h2>
                    <p>Send instant announcements, news, and notifications to app users. Track sent broadcast notifications and delete past campaigns at any time.</p>
                </div>
            </div>

            {/* Campaign Sender Cards */}
            <div className="broadcasts-grid">
                {/* Driver Broadcast Card */}
                <div className="broadcast-card driver-card-glow">
                    <div className="card-header-accent driver-header">
                        <span className="material-icons">directions_car</span>
                        <h3>Send to Drivers</h3>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSendDrivers} className="broadcast-form">
                            <div className="form-group">
                                <label htmlFor="driver-title">Notification Title</label>
                                <input
                                    type="text"
                                    id="driver-title"
                                    name="title"
                                    value={driverForm.title}
                                    onChange={handleDriverChange}
                                    placeholder="Enter title (e.g. Traffic Alert or Promo)"
                                    maxLength="100"
                                    required
                                />
                                <span className="char-count">{driverForm.title.length}/100</span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="driver-body">Message / Body</label>
                                <textarea
                                    id="driver-body"
                                    name="body"
                                    value={driverForm.body}
                                    onChange={handleDriverChange}
                                    placeholder="Enter custom message to all drivers..."
                                    rows="5"
                                    maxLength="500"
                                    required
                                />
                                <span className="char-count">{driverForm.body.length}/500</span>
                            </div>

                            <button 
                                type="submit" 
                                className="broadcast-send-btn send-driver-btn" 
                                disabled={loadingDriver}
                            >
                                {loadingDriver ? (
                                    <>
                                        <span className="spinner"></span> Scheduling...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons">send</span> Send to Drivers
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Passenger Broadcast Card */}
                <div className="broadcast-card passenger-card-glow">
                    <div className="card-header-accent passenger-header">
                        <span className="material-icons">person_outline</span>
                        <h3>Send to Passengers</h3>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSendPassengers} className="broadcast-form">
                            <div className="form-group">
                                <label htmlFor="passenger-title">Notification Title</label>
                                <input
                                    type="text"
                                    id="passenger-title"
                                    name="title"
                                    value={passengerForm.title}
                                    onChange={handlePassengerChange}
                                    placeholder="Enter title (e.g. Weekend Discount or Update)"
                                    maxLength="100"
                                    required
                                />
                                <span className="char-count">{passengerForm.title.length}/100</span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="passenger-body">Message / Body</label>
                                <textarea
                                    id="passenger-body"
                                    name="body"
                                    value={passengerForm.body}
                                    onChange={handlePassengerChange}
                                    placeholder="Enter custom message to all passengers..."
                                    rows="5"
                                    maxLength="500"
                                    required
                                />
                                <span className="char-count">{passengerForm.body.length}/500</span>
                            </div>

                            <button 
                                type="submit" 
                                className="broadcast-send-btn send-passenger-btn" 
                                disabled={loadingPassenger}
                            >
                                {loadingPassenger ? (
                                    <>
                                        <span className="spinner"></span> Scheduling...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons">send</span> Send to Passengers
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="broadcast-card update-campaign-card">
                <div className="card-header-accent update-header">
                    <span className="material-icons">system_update</span>
                    <div><h3>Publish Required App Update</h3><small>Upload the signed APK to the website before publishing.</small></div>
                </div>
                <div className="card-body">
                    <form onSubmit={handlePublishUpdate} className="broadcast-form update-form-grid">
                        <div className="form-group"><label>App</label><select name="app" value={updateForm.app} onChange={handleUpdateChange}><option value="passenger">Passenger App</option><option value="driver">Driver App</option></select></div>
                        <div className="form-group"><label>Latest version</label><input name="latest_version" value={updateForm.latest_version} onChange={handleUpdateChange} pattern="\d+\.\d+\.\d+" placeholder="1.1.0" required /></div>
                        <div className="form-group"><label>Minimum required version</label><input name="minimum_version" value={updateForm.minimum_version} onChange={handleUpdateChange} pattern="\d+\.\d+\.\d+" placeholder="1.1.0" required /></div>
                        <div className="form-group update-wide"><label>Notification title</label><input name="title" maxLength="100" value={updateForm.title} onChange={handleUpdateChange} required /></div>
                        <div className="form-group update-wide"><label>Message</label><textarea name="message" rows="3" maxLength="500" value={updateForm.message} onChange={handleUpdateChange} required /></div>
                        <div className="apk-upload-panel update-wide">
                            <div className="form-group">
                                <label>Signed Android APK (maximum 250 MB)</label>
                                <input type="file" accept=".apk,application/vnd.android.package-archive" onChange={event => setApkFile(event.target.files?.[0] || null)} />
                                {loadingApk && (
                                    <div className="apk-upload-progress">
                                        <div className="apk-upload-progress-bar">
                                            <div className="apk-upload-progress-fill" style={{ width: `${apkUploadStats.percent}%` }}></div>
                                        </div>
                                        <div className="apk-upload-progress-meta">
                                            <span className="apk-upload-progress-text">{apkUploadStats.percent}% &middot; {formatBytes(apkUploadStats.loaded)} of {formatBytes(apkUploadStats.total)}</span>
                                            <span className="apk-upload-progress-sub">{formatBytes(apkUploadStats.speedBps)}/s &middot; {apkUploadStats.etaSeconds != null ? `${formatDuration(apkUploadStats.etaSeconds)} remaining` : 'Estimating...'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button type="button" className="apk-upload-btn" onClick={handleUploadApk} disabled={loadingApk || !apkFile}>{loadingApk ? 'Uploading...' : 'Upload APK'}</button>
                        </div>
                        <div className={`release-status update-wide ${activeRelease ? 'ready' : ''}`}>
                            {activeRelease ? <><strong>Active APK: {activeRelease.version}</strong><span>{activeRelease.original_name} · {(activeRelease.size / 1048576).toFixed(1)} MB · Uploaded {new Date(activeRelease.uploaded_at).toLocaleString()}</span></> : <><strong>No APK uploaded</strong><span>Upload an APK before publishing this update.</span></>}
                        </div>
                        <div className="update-warning update-wide">The notification opens https://picku.lk/get-app. Publishing blocks older app versions.</div>
                        <button type="submit" className="broadcast-send-btn update-send-btn update-wide" disabled={loadingUpdate || !activeRelease || activeRelease.version !== updateForm.latest_version}><span className="material-icons">publish</span>{loadingUpdate ? 'Publishing...' : 'Publish & Notify Users'}</button>
                    </form>
                </div>
            </div>
            {/* Sent Broadcasts History Section */}
            <div className="broadcast-history-section">
                <div className="history-header">
                    <div className="history-title-block">
                        <span className="material-icons history-title-icon">history</span>
                        <div>
                            <h3>Sent Notification History</h3>
                            <p>Review previously broadcasted push notifications and manage or delete sent items.</p>
                        </div>
                    </div>
                    <div className="history-header-actions">
                        <span className="broadcast-count-badge">
                            Total: <strong>{pagination.total}</strong> sent
                        </span>
                        <button 
                            type="button" 
                            className="history-refresh-btn" 
                            onClick={loadBroadcasts}
                            title="Refresh sent notifications"
                        >
                            <span className={`material-icons ${loadingHistory ? 'spin-icon' : ''}`}>refresh</span>
                            Refresh
                        </button>
                        {pagination.total > 0 && (
                            <button
                                type="button"
                                className="history-clear-btn"
                                onClick={handleClearAll}
                                title="Clear all broadcast notifications"
                            >
                                <span className="material-icons">delete_sweep</span>
                                Clear All
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="history-toolbar">
                    <div className="history-search-wrapper">
                        <span className="material-icons search-icon">search</span>
                        <input
                            type="text"
                            placeholder="Search by title or message..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="history-search-input"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={() => setSearchQuery('')}
                            >
                                <span className="material-icons">close</span>
                            </button>
                        )}
                    </div>

                    <div className="history-filter-tabs">
                        <button
                            type="button"
                            className={`filter-tab ${targetFilter === 'all_targets' ? 'active' : ''}`}
                            onClick={() => { setTargetFilter('all_targets'); setPage(1); }}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            className={`filter-tab tab-driver ${targetFilter === 'driver' ? 'active' : ''}`}
                            onClick={() => { setTargetFilter('driver'); setPage(1); }}
                        >
                            <span className="material-icons">directions_car</span> Drivers
                        </button>
                        <button
                            type="button"
                            className={`filter-tab tab-passenger ${targetFilter === 'passenger' ? 'active' : ''}`}
                            onClick={() => { setTargetFilter('passenger'); setPage(1); }}
                        >
                            <span className="material-icons">person_outline</span> Passengers
                        </button>
                        <button
                            type="button"
                            className={`filter-tab tab-all ${targetFilter === 'all' ? 'active' : ''}`}
                            onClick={() => { setTargetFilter('all'); setPage(1); }}
                        >
                            <span className="material-icons">groups</span> All Users
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="history-list-card">
                    {loadingHistory ? (
                        <div className="history-loading-state">
                            <div className="history-spinner"></div>
                            <p>Loading sent notifications...</p>
                        </div>
                    ) : broadcasts.length === 0 ? (
                        <div className="history-empty-state">
                            <span className="material-icons empty-icon">mark_email_read</span>
                            <h4>No broadcast notifications found</h4>
                            <p>
                                {searchQuery || targetFilter !== 'all_targets'
                                    ? 'No sent notifications match your current search or filter criteria.'
                                    : 'You have not sent any broadcast notifications yet. Use the cards above to broadcast a notification.'}
                            </p>
                        </div>
                    ) : (
                        <div className="broadcast-table-wrapper">
                            <table className="broadcast-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '140px' }}>Audience</th>
                                        <th style={{ width: '220px' }}>Title</th>
                                        <th>Message</th>
                                        <th style={{ width: '170px' }}>Sent Date</th>
                                        <th style={{ width: '110px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {broadcasts.map((item) => (
                                        <tr key={item.id} className="broadcast-row">
                                            <td>
                                                {renderAudienceBadge(item.target)}
                                            </td>
                                            <td>
                                                <div className="broadcast-title-cell" title={item.title}>
                                                    <strong>{item.title}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="broadcast-message-cell">
                                                    <p>{item.message}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="broadcast-date-cell">
                                                    <span className="date-main">{formatDateTime(item.created_at)}</span>
                                                    <span className="date-relative">{formatTimeAgo(item.created_at)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="broadcast-actions-cell">
                                                    <button
                                                        type="button"
                                                        className="action-btn view-btn"
                                                        title="View Details"
                                                        onClick={() => setSelectedBroadcast(item)}
                                                    >
                                                        <span className="material-icons">visibility</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="action-btn delete-btn"
                                                        title="Delete Broadcast Notification"
                                                        disabled={deletingId === item.id}
                                                        onClick={() => handleDeleteBroadcast(item)}
                                                    >
                                                        {deletingId === item.id ? (
                                                            <span className="mini-spinner"></span>
                                                        ) : (
                                                            <span className="material-icons">delete_outline</span>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {!loadingHistory && pagination.totalPages > 1 && (
                        <div className="history-pagination">
                            <div className="pagination-info">
                                Showing {((page - 1) * perPage) + 1} - {Math.min(page * perPage, pagination.total)} of {pagination.total} broadcasts
                            </div>
                            <div className="pagination-controls">
                                <button
                                    type="button"
                                    className="pagination-btn"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                >
                                    <span className="material-icons">chevron_left</span> Prev
                                </button>
                                {getVisiblePages().map((pageNum) => (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        className={`pagination-btn page-num ${pageNum === page ? 'active' : ''}`}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="pagination-btn"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                >
                                    Next <span className="material-icons">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Broadcast Details Modal */}
            <Modal
                isOpen={Boolean(selectedBroadcast)}
                onClose={() => setSelectedBroadcast(null)}
                title="Broadcast Notification Details"
                subtitle="Complete details of the sent campaign notification"
                size="medium"
            >
                {selectedBroadcast && (
                    <div className="broadcast-modal-content">
                        <div className="modal-field-row">
                            <label>Target Audience</label>
                            <div>{renderAudienceBadge(selectedBroadcast.target)}</div>
                        </div>

                        <div className="modal-field-row">
                            <label>Sent Timestamp</label>
                            <div className="modal-timestamp">
                                <span className="material-icons">schedule</span>
                                {formatDateTime(selectedBroadcast.created_at)} ({formatTimeAgo(selectedBroadcast.created_at)})
                            </div>
                        </div>

                        <div className="modal-field-row">
                            <label>Notification Title</label>
                            <div className="modal-title-box">
                                {selectedBroadcast.title}
                            </div>
                        </div>

                        <div className="modal-field-row">
                            <label>Message Content</label>
                            <div className="modal-message-box">
                                {selectedBroadcast.message}
                            </div>
                        </div>

                        <div className="modal-actions-row">
                            <button
                                type="button"
                                className="modal-delete-btn"
                                onClick={() => handleDeleteBroadcast(selectedBroadcast)}
                            >
                                <span className="material-icons">delete</span>
                                Delete Notification
                            </button>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setSelectedBroadcast(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Broadcasts;
