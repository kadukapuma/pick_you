import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import useVehicleDetails from '../../hooks/useVehicleDetails'
import { resolveAssetUrl, statusOptions, updateVehicleStatus } from '../../services/adminApi'

import Swal from 'sweetalert2'
import './DetailView.css'

const VehicleDetail = () => {
    const { vehicleId } = useParams()
    const { token } = useAdmin()
    const { vehiclesState } = useOutletContext()
    const { updateVehicle } = vehiclesState
    const { vehicleDetails, loading, error, setVehicleDetails } =
        useVehicleDetails(token, vehicleId)
    const [statusSaving, setStatusSaving] = useState(false)
    const [statusError, setStatusError] = useState('')
    const navigate = useNavigate()

    const handleStatusUpdate = async (nextStatus) => {
        if (!vehicleId) return

        const result = await Swal.fire({
            title: 'Update Vehicle Status?',
            text: `Are you sure you want to change the vehicle status to ${nextStatus.toUpperCase()}?`,
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
            const data = await updateVehicleStatus(token, vehicleId, nextStatus)
            setVehicleDetails((prev) =>
                prev ? { ...prev, vehicle: data.vehicle } : prev,
            )
            updateVehicle(data.vehicle)

            Swal.fire({
                title: 'Updated!',
                text: 'Vehicle status has been updated successfully.',
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
                    <p className="muted">Loading vehicle details...</p>
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

    if (!vehicleDetails?.vehicle) {
        return (
            <section className="content-grid">
                <div className="card">
                    <p className="muted">Select a vehicle to view details.</p>
                </div>
            </section>
        )
    }

    const { vehicle, documents } = vehicleDetails

    return (
        <section className="content-page">
            <div className="detail-view">
                <div className="detail-main">
                    <div className="detail-card" style={{ marginBottom: 32 }}>
                        <div className="detail-section">
                            <h3>Vehicle Specifications</h3>
                            <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 32 }}>
                                <div className="brand-icon" style={{ width: 80, height: 80, borderRadius: 16, background: '#f8f9fa', color: '#1a1f2b', fontSize: 40 }}>
                                    <span className="material-icons" style={{ fontSize: 40 }}>directions_car</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ marginBottom: 8 }}>{vehicle.plate_number}</h2>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <span className={`badge-status ${vehicle.status || 'pending'}`}>
                                            {vehicle.status || 'pending'}
                                        </span>
                                        <span className="stat-pill" style={{ border: 'none', background: '#f8f9fa' }}>
                                            {vehicle.vehicle_type || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-row">
                                <div className="info-item">
                                    <label>Make</label>
                                    <span>{vehicle.make}</span>
                                </div>
                                <div className="info-item">
                                    <label>Model</label>
                                    <span>{vehicle.model}</span>
                                </div>
                                <div className="info-item">
                                    <label>Year</label>
                                    <span>{vehicle.year || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Color</label>
                                    <span>{vehicle.color || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3>Assigned Driver</h3>
                            {vehicle.driver ? (
                                <div className="info-row">
                                    <div className="info-item">
                                        <label>Full Name</label>
                                        <span
                                            style={{ cursor: 'pointer', color: '#08d612', textDecoration: 'underline' }}
                                            onClick={() => navigate(`/drivers/${vehicle.driver.id}`)}
                                        >
                                            {vehicle.driver.name}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <label>Email</label>
                                        <span>{vehicle.driver.email}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Phone</label>
                                        <span>{vehicle.driver.phone}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>License</label>
                                        <span>{vehicle.driver.license_number || 'N/A'}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="muted">No driver assigned to this vehicle.</p>
                            )}
                        </div>
                    </div>

                    <div className="detail-card" style={{ marginBottom: 32 }}>
                        <div className="detail-section">
                            <h3>Vehicle Photos</h3>
                            {vehicle.images ? (
                                <div className="document-grid">
                                    {[
                                        { key: 'insurance_img', label: 'Insurance' },
                                        { key: 'licence_img', label: 'License' },
                                        { key: 'v_front', label: 'Front View' },
                                        { key: 'v_back', label: 'Back View' },
                                        { key: 'v_side', label: 'Side View' },
                                    ].map((img) => (
                                        <div className="document-card" key={img.key}>
                                            {vehicle.images[img.key] ? (
                                                <a href={resolveAssetUrl(vehicle.images[img.key])} target="_blank" rel="noreferrer">
                                                    <img src={resolveAssetUrl(vehicle.images[img.key])} alt={img.label} />
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
                            ) : (
                                <p className="muted">No photos available for this vehicle.</p>
                            )}
                        </div>

                        <div className="detail-section" style={{ marginBottom: 0 }}>
                            <h3>Legal Documents</h3>
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
                                <p className="muted">No legal documents uploaded.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="detail-side">
                    <div className="detail-card">
                        <div className="detail-section">
                            <h3>Vehicle Approval</h3>
                            <p className="muted" style={{ fontSize: 13, marginBottom: 24 }}>
                                Approve or suspend this vehicle for active service.
                            </p>

                            <div className="status-panel" style={{ padding: 0, background: 'none', border: 'none' }}>
                                <label style={{ marginBottom: 12 }}>Current Status</label>
                                <select
                                    className="badge-status"
                                    style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 8, border: '1px solid #dee2e6', background: 'white' }}
                                    value={vehicle.status || 'pending'}
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
                            <h3>Compliance Check</h3>
                            <div className="info-item" style={{ marginBottom: 16 }}>
                                <label>Safety Inspection</label>
                                <span style={{ color: '#0ca678', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="material-icons" style={{ fontSize: 16 }}>verified</span>
                                    Verified
                                </span>
                            </div>
                            <div className="info-item">
                                <label>Insurance Status</label>
                                <span style={{ color: '#0ca678' }}>Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default VehicleDetail

