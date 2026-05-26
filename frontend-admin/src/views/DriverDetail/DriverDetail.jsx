import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import useDriverDetails from '../../hooks/useDriverDetails'
import { resolveAssetUrl, statusOptions, updateDriverStatus } from '../../services/adminApi'
import VehicleTypeIcon from '../../components/VehicleTypeIcon/VehicleTypeIcon'

import Swal from 'sweetalert2'
import './DetailView.css'

const DriverDetail = () => {
    const { driverId } = useParams()
    const { token } = useAdmin()
    const { driversState } = useOutletContext()
    const { updateDriver } = driversState
    const { driverDetails, loading, error, setDriverDetails } =
        useDriverDetails(token, driverId)
    const [statusSaving, setStatusSaving] = useState(false)
    const [statusError, setStatusError] = useState('')
    const [showVehiclesModal, setShowVehiclesModal] = useState(false)
    const navigate = useNavigate()

    const handleStatusUpdate = async (nextStatus) => {
        if (!driverId) return

        const result = await Swal.fire({
            title: 'Update Status?',
            text: `Are you sure you want to change the status to ${nextStatus.toUpperCase()}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#08d612',
            cancelButtonColor: '#1a1f2b',
            confirmButtonText: 'Yes, update it!'
        })

        if (!result.isConfirmed) return

        setStatusSaving(true)
        setStatusError('')

        try {
            const data = await updateDriverStatus(token, driverId, nextStatus)
            setDriverDetails((prev) =>
                prev ? { ...prev, driver: data.driver } : prev,
            )
            updateDriver(data.driver)

            Swal.fire({
                title: 'Updated!',
                text: 'Driver status has been updated successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
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
                    <p className="muted">Loading driver details...</p>
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

    if (!driverDetails?.driver) {
        return (
            <section className="content-grid">
                <div className="card">
                    <p className="muted">Select a driver to view details.</p>
                </div>
            </section>
        )
    }

    const { driver, documents } = driverDetails
    const bank = driver?.bank_account || null

    return (
        <section className="content-page">
            <div className="detail-view">
                <div className="detail-main">
                    <div className="detail-card" style={{ marginBottom: 32 }}>
                        <div className="detail-section">
                            <h3>Personal Information</h3>
                            <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 32 }}>
                                <div className="avatar-initials" style={{ width: 100, height: 100, fontSize: 32 }}>
                                    {driver.profile_picture_path ? (
                                        <img src={resolveAssetUrl(driver.profile_picture_path)} alt={driver.name} />
                                    ) : (
                                        driver.name?.charAt(0) || 'D'
                                    )}
                                    <span className={`presence-dot ${Number(driver?.availability) === 1 ? 'online' : 'offline'}`} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ marginBottom: 8 }}>{driver.name}</h2>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <span className={`badge-status ${driver.status || 'pending'}`}>
                                            {driver.status || 'pending'}
                                        </span>
                                        <span className="stat-pill" style={{ border: 'none', background: '#f8f9fa' }}>
                                            <span className="material-icons star" style={{ fontSize: 14 }}>star</span>
                                            {driver.rating || '0.0'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    {driver?.vehicles && driver.vehicles.length > 0 && (
                                        <button
                                            type="button"
                                            className="btn-view"
                                            title="View vehicles"
                                            aria-label="View vehicles"
                                            onClick={() => setShowVehiclesModal(true)}
                                        >
                                            <span className="material-icons">directions_car</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="info-row">
                                <div className="info-item">
                                    <label>Email Address</label>
                                    <span>{driver.email}</span>
                                </div>
                                <div className="info-item">
                                    <label>Phone Number</label>
                                    <span>{driver.phone}</span>
                                </div>
                                <div className="info-item">
                                    <label>License Number</label>
                                    <span>{driver.license_number || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Registered Date</label>
                                    <span>{new Date(driver.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3>Banking Information</h3>
                            {bank ? (
                                <div className="info-row">
                                    <div className="info-item">
                                        <label>Bank Name</label>
                                        <span>{bank.bank_name || 'N/A'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Account Number</label>
                                        <span>{bank.account_number || 'N/A'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Account Holder</label>
                                        <span>{bank.account_holder_name || 'N/A'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>IBAN / Swift</label>
                                        <span>{bank.iban || 'N/A'}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="muted">No bank account information provided.</p>
                            )}
                        </div>
                    </div>

                    <div className="detail-card" style={{ marginBottom: 32 }}>
                        <div className="detail-section">
                            <h3>Driving License</h3>
                            <div className="document-grid">
                                {[
                                    { key: 'license_front_path', label: 'License Front' },
                                    { key: 'license_back_path', label: 'License Back' },
                                ].map((img) => (
                                    <div className="document-card" key={img.key}>
                                        {driver[img.key] ? (
                                            <a href={resolveAssetUrl(driver[img.key])} target="_blank" rel="noreferrer">
                                                <img src={resolveAssetUrl(driver[img.key])} alt={img.label} />
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
                        </div>

                        <div className="detail-section" style={{ marginBottom: 0 }}>
                            <h3>Additional Documents</h3>
                            {Object.keys(documents || {}).length > 0 ? (
                                <div className="document-grid">
                                    {Object.entries(documents || {}).map(([key, doc]) => (
                                        <div className="document-card" key={key}>
                                            {doc?.url ? (
                                                <a href={resolveAssetUrl(doc.url)} target="_blank" rel="noreferrer">
                                                    <img src={resolveAssetUrl(doc.url)} alt={key} />
                                                    <p>{key.replace(/_/g, ' ')}</p>
                                                </a>
                                            ) : (
                                                <div style={{ padding: 20 }}>
                                                    <span className="material-icons muted" style={{ fontSize: 48 }}>description</span>
                                                    <p className="muted">{key.replace(/_/g, ' ')} missing</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="muted">No additional documents uploaded.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="detail-side">
                    <div className="detail-card">
                        <div className="detail-section">
                            <h3>Account Management</h3>
                            <p className="muted" style={{ fontSize: 13, marginBottom: 24 }}>
                                Change the verification status of this driver account.
                            </p>

                            <div className="status-panel" style={{ padding: 0, background: 'none', border: 'none' }}>
                                <label style={{ marginBottom: 12 }}>Verification Status</label>
                                <select
                                    className="badge-status"
                                    style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 8, border: '1px solid #dee2e6', background: 'white' }}
                                    value={driver.status || 'pending'}
                                    onChange={(event) => handleStatusUpdate(event.target.value)}
                                    disabled={statusSaving}
                                >
                                    {statusOptions.map((status) => (
                                        <option key={status} value={status}>
                                            {status.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {statusSaving && <p className="muted" style={{ marginTop: 12 }}>Updating status...</p>}
                            {statusError && <p className="form-error" style={{ marginTop: 12 }}>{statusError}</p>}
                        </div>

                        <div className="detail-section" style={{ marginBottom: 0 }}>
                            <h3>Safety & Compliance</h3>
                            <div className="info-item" style={{ marginBottom: 16 }}>
                                <label>Background Check</label>
                                <span style={{ color: '#0ca678', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="material-icons" style={{ fontSize: 16 }}>verified</span>
                                    Passed
                                </span>
                            </div>
                            <div className="info-item">
                                <label>Training Completed</label>
                                <span>Yes, 2024-02-10</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showVehiclesModal && driver?.vehicles && driver.vehicles.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={() => setShowVehiclesModal(false)}
                >
                    <div
                        className="data-table-container"
                        style={{
                            maxWidth: '900px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            padding: 32
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                            <div>
                                <h2>Registered Vehicles</h2>
                                <p className="muted">{driver.name} has {driver.vehicles.length} vehicle(s)</p>
                            </div>
                            <button className="btn-view" title="Close vehicles modal" aria-label="Close vehicles modal" onClick={() => setShowVehiclesModal(false)}>
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <div className="table-header" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 80px' }}>
                            <span>Plate</span>
                            <span>Vehicle</span>
                            <span>Make & Model</span>
                            <span>Status</span>
                            <span>Action</span>
                        </div>
                        <div className="table-body">
                            {driver.vehicles.map((vehicle) => (
                                <div className="table-row" key={vehicle.id} style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 80px' }}>
                                    <div className="cell-driver">
                                        <VehicleTypeIcon
                                            type={vehicle.vehicle_type}
                                            size={18}
                                            style={{ width: 36, height: 36, justifyContent: 'center', padding: 0, marginRight: 12 }}
                                        />
                                        <div className="driver-info">
                                            <h4>{vehicle.plate_number}</h4>
                                            <p>{vehicle.vehicle_type || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="cell-license">
                                        <p>{vehicle.make}</p>
                                        <p className="muted">{vehicle.model}</p>
                                    </div>
                                    <div className="cell-trips">
                                        <p>{vehicle.year || 'N/A'}</p>
                                        <p className="muted">{vehicle.color || 'N/A'}</p>
                                    </div>
                                    <div className="cell-status">
                                        <span className={`badge-status ${vehicle.status || 'pending'}`}>
                                            {vehicle.status || 'pending'}
                                        </span>
                                    </div>
                                    <div className="cell-actions">
                                        <button
                                            type="button"
                                            className="btn-view"
                                            title="View vehicle"
                                            aria-label="View vehicle"
                                            onClick={() => {
                                                setShowVehiclesModal(false)
                                                navigate(`/vehicles/${vehicle.id}`)
                                            }}
                                        >
                                            <span className="material-icons">visibility</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

export default DriverDetail

