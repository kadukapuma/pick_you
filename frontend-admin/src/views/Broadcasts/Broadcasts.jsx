import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { sendBulkNotification } from '../../services/adminApi';
import Swal from 'sweetalert2';
import './Broadcasts.css';

const Broadcasts = () => {
    const { token } = useAdmin();
    const [loadingDriver, setLoadingDriver] = useState(false);
    const [loadingPassenger, setLoadingPassenger] = useState(false);

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
        </div>
    );
};

export default Broadcasts;
