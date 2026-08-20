import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import usePassengerDetails from '../../hooks/usePassengerDetails'
import { resolveAssetUrl, updatePassengerStudentStatus } from '../../services/adminApi'

import Swal from 'sweetalert2'
import '../DriverDetail/DetailView.css'

const studentStatusActions = ['approved', 'rejected']

const PassengerDetail = () => {
    const { passengerId } = useParams()
    const { token } = useAdmin()
    const { passengerDetails, loading, error, setPassengerDetails } =
        usePassengerDetails(token, passengerId)
    const [statusSaving, setStatusSaving] = useState(false)
    const [statusError, setStatusError] = useState('')

    const handleStatusUpdate = async (nextStatus) => {
        if (!passengerId) return

        let rejectionReason = null
        if (nextStatus === 'rejected') {
            const { value, isConfirmed } = await Swal.fire({
                title: 'Reject application?',
                input: 'text',
                inputLabel: 'Reason (optional)',
                inputPlaceholder: 'e.g. Documents unclear',
                showCancelButton: true,
                confirmButtonColor: '#fa5252',
                cancelButtonColor: '#1a1f2b',
                confirmButtonText: 'Reject it',
            })
            if (!isConfirmed) return
            rejectionReason = value || null
        } else {
            const result = await Swal.fire({
                title: 'Approve student status?',
                text: 'This passenger will start earning loyalty points on future rides and will be notified by SMS.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#08d612',
                cancelButtonColor: '#1a1f2b',
                confirmButtonText: 'Yes, approve it!',
            })
            if (!result.isConfirmed) return
        }

        setStatusSaving(true)
        setStatusError('')

        try {
            const { passenger } = await updatePassengerStudentStatus(token, passengerId, nextStatus, rejectionReason)
            setPassengerDetails((prev) => (prev ? { ...prev, passenger } : prev))

            Swal.fire({
                title: 'Updated!',
                text: `Student verification has been ${nextStatus}. The passenger has been notified by SMS.`,
                icon: 'success',
                timer: 2500,
                showConfirmButton: false,
            })
        } catch (saveError) {
            setStatusError(saveError.message)
            Swal.fire('Error', saveError.message, 'error')
        } finally {
            setStatusSaving(false)
        }
    }

    if (loading) {
        return (
            <section className="content-grid">
                <div className="card">
                    <p className="muted">Loading passenger details...</p>
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="content-grid">
                <div className="card">
                    <p className="form-error">{error}</p>
                </div>
            </section>
        )
    }

    const passenger = passengerDetails?.passenger
    if (!passenger) {
        return (
            <section className="content-grid">
                <div className="card">
                    <p className="muted">Select a passenger to view details.</p>
                </div>
            </section>
        )
    }

    const verification = passenger.student_verification

    return (
        <section className="content-page">
            <div className="detail-view">
                <div className="detail-main">
                    <div className="detail-card" style={{ marginBottom: 32 }}>
                        <div className="detail-section">
                            <h3>Personal Information</h3>
                            <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 32 }}>
                                <div className="avatar-initials" style={{ width: 100, height: 100, fontSize: 32 }}>
                                    {passenger.user?.first_name?.charAt(0) || 'P'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ marginBottom: 8 }}>
                                        {passenger.user?.first_name} {passenger.user?.last_name}
                                    </h2>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <span className={`badge-status ${verification?.status || 'pending'}`}>
                                            {verification ? verification.status : 'not applied'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-row">
                                <div className="info-item">
                                    <label>Email Address</label>
                                    <span>{passenger.user?.email || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Phone Number</label>
                                    <span>{passenger.user?.phone || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Wallet Balance</label>
                                    <span>LKR {passenger.wallet_balance}</span>
                                </div>
                                <div className="info-item">
                                    <label>Loyalty Points</label>
                                    <span>{passenger.loyalty_points_balance ?? '0.00'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="detail-card" style={{ marginBottom: 32 }}>
                        <div className="detail-section" style={{ marginBottom: 0 }}>
                            <h3>Student Verification</h3>
                            {verification ? (
                                <>
                                    <div className="info-row" style={{ marginBottom: 20 }}>
                                        <div className="info-item">
                                            <label>University</label>
                                            <span>{verification.university_name}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Submitted</label>
                                            <span>{new Date(verification.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="document-grid">
                                        {[
                                            { key: 'card_front_path', label: 'Admission Card - Front' },
                                            { key: 'card_back_path', label: 'Admission Card - Back' },
                                        ].map((img) => (
                                            <div className="document-card" key={img.key}>
                                                {verification[img.key] ? (
                                                    <a href={resolveAssetUrl(verification[img.key])} target="_blank" rel="noreferrer">
                                                        <img src={resolveAssetUrl(verification[img.key])} alt={img.label} />
                                                        <p>{img.label}</p>
                                                    </a>
                                                ) : (
                                                    <div style={{ padding: 20 }}>
                                                        <span className="material-icons muted" style={{ fontSize: 48 }}>image_not_supported</span>
                                                        <p className="muted">{img.label} missing</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="muted">No student application submitted.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="detail-side">
                    <div className="detail-card">
                        <div className="detail-section" style={{ marginBottom: 0 }}>
                            <h3>Verification Status</h3>
                            {verification ? (
                                <>
                                    <p className="muted" style={{ fontSize: 13, marginBottom: 24 }}>
                                        Approve or reject this passenger's student application.
                                    </p>
                                    <div className="status-panel" style={{ padding: 0, background: 'none', border: 'none' }}>
                                        <label style={{ marginBottom: 12 }}>Change status</label>
                                        <select
                                            className="badge-status"
                                            style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 8, border: '1px solid #dee2e6', background: 'white' }}
                                            value={studentStatusActions.includes(verification.status) ? verification.status : ''}
                                            onChange={(event) => event.target.value && handleStatusUpdate(event.target.value)}
                                            disabled={statusSaving}
                                        >
                                            {!studentStatusActions.includes(verification.status) && (
                                                <option value="" disabled>PENDING - choose an action</option>
                                            )}
                                            {studentStatusActions.map((status) => (
                                                <option key={status} value={status}>
                                                    {status.toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {verification.rejection_reason ? (
                                        <p className="muted" style={{ marginTop: 16 }}>
                                            Rejection reason: {verification.rejection_reason}
                                        </p>
                                    ) : null}
                                    {statusSaving && <p className="muted" style={{ marginTop: 12 }}>Updating status...</p>}
                                    {statusError && <p className="form-error" style={{ marginTop: 12 }}>{statusError}</p>}
                                </>
                            ) : (
                                <p className="muted">Nothing to review yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default PassengerDetail
