import { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { fetchAppRelease, publishAppUpdate, sendBulkNotification, uploadAppApk } from '../../services/adminApi';
import Swal from 'sweetalert2';
import './Broadcasts.css';

const Broadcasts = () => {
    const { token } = useAdmin();
    const [loadingDriver, setLoadingDriver] = useState(false);
    const [loadingPassenger, setLoadingPassenger] = useState(false);
    const [loadingUpdate, setLoadingUpdate] = useState(false);
    const [loadingApk, setLoadingApk] = useState(false);
    const [apkFile, setApkFile] = useState(null);
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

    const [driverForm, setDriverForm] = useState({
        title: '',
        body: ''
    });

    const [passengerForm, setPassengerForm] = useState({
        title: '',
        body: ''
    });

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
        try {
            const release = await uploadAppApk(token, updateForm.app, updateForm.latest_version, apkFile);
            setActiveRelease(release);
            setApkFile(null);
            await Swal.fire({ icon: 'success', title: 'APK Uploaded', text: `${release.original_name} is now the active ${updateForm.app} download.` });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Upload Failed', text: error.message || 'The APK could not be uploaded.' });
        } finally {
            setLoadingApk(false);
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
                text: 'Bulk campaign scheduled for drivers successfully!'
            });
            setDriverForm({ title: '', body: '' });
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
                text: 'Bulk campaign scheduled for passengers successfully!'
            });
            setPassengerForm({ title: '', body: '' });
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

    return (
        <div className="broadcasts-container">
            <div className="broadcasts-header-section">
                <span className="material-icons broadcast-icon-large">campaign</span>
                <div className="broadcasts-intro">
                    <h2>Push Notification Campaigns</h2>
                    <p>Send instant announcements, news, and notifications to app users. Jobs are processed asynchronously in the queue to maintain server speed.</p>
                </div>
            </div>

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
                            <div className="form-group"><label>Signed Android APK (maximum 250 MB)</label><input type="file" accept=".apk,application/vnd.android.package-archive" onChange={event => setApkFile(event.target.files?.[0] || null)} /></div>
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
        </div>
    );
};

export default Broadcasts;
