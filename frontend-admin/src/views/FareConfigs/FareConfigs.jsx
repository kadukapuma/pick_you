import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../../context/AdminContext'
import DataTable from '../../components/DataTable/DataTable'
import SearchBar from '../../components/SearchBar/SearchBar'
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton'
import Modal from '../../components/Modal/Modal'
import FormInput from '../../components/FormInput/FormInput'
import FormActions from '../../components/FormActions/FormActions'
import {
    createFareConfig,
    fetchFareConfigs,
    updateFareConfig,
    fetchVehicleTypes,
} from '../../services/adminApi'
import './FareConfigs.css'

const defaultForm = {
    vehicle_type: '',
    base_fare: '0',
    per_km_rate: '0',
    per_minute_rate: '0',
    cancellation_fee: '0',
    is_active: false,
}

const numericFields = [
    'base_fare',
    'per_km_rate',
    'per_minute_rate',
    'cancellation_fee',
]

const formatMoney = (value) => {
    const amount = Number(value)
    if (Number.isNaN(amount)) return '0.00'
    return amount.toFixed(2)
}

const FareConfigs = () => {
    const { token } = useAdmin()
    const [fareConfigs, setFareConfigs] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [isModalOpen, setModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [vehicleTypes, setVehicleTypes] = useState([])

    const loadFareConfigs = async () => {
        if (!token) return

        try {
            setLoading(true)
            const response = await fetchFareConfigs(token)
            setFareConfigs(response.fareConfigs || [])
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to fetch fare configurations', 'error')
        } finally {
            setLoading(false)
        }
    }

    const loadVehicleTypesList = async () => {
        try {
            const response = await fetchVehicleTypes(token)
            setVehicleTypes(response.vehicleTypes || [])
        } catch (error) {
            console.error('Failed to load vehicle types:', error)
        }
    }

    useEffect(() => {
        if (!token) {
            setFareConfigs([])
            setVehicleTypes([])
            setLoading(false)
            return
        }

        loadFareConfigs()
        loadVehicleTypesList()
    }, [token])

    const filteredFareConfigs = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return fareConfigs

        return fareConfigs.filter((item) =>
            String(item.vehicle_type || '').toLowerCase().includes(query),
        )
    }, [fareConfigs, search])

    const activeCount = useMemo(
        () => fareConfigs.filter((item) => Boolean(item.is_active)).length,
        [fareConfigs],
    )

    const inactiveCount = useMemo(
        () => fareConfigs.filter((item) => !item.is_active).length,
        [fareConfigs],
    )

    const resetForm = () => {
        setForm(defaultForm)
        setEditingId(null)
    }

    const openCreateModal = () => {
        resetForm()
        setModalOpen(true)
    }

    const closeModal = () => {
        if (saving) return
        resetForm()
        setModalOpen(false)
    }

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const validateForm = () => {
        if (!form.vehicle_type.trim()) {
            return 'Vehicle type is required.'
        }

        for (const field of numericFields) {
            const value = Number(form[field])
            if (Number.isNaN(value) || value < 0) {
                return 'All fare values must be a valid number (0 or higher).'
            }
        }

        return null
    }

    const [formErrors, setFormErrors] = useState({})

    const handleFormChange = (event) => {
        const { name, value, type, checked } = event.target
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
        // Clear error for this field when user starts typing
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }))
        }
    }

    const normalizePayload = () => ({
        vehicle_type: form.vehicle_type.trim(),
        base_fare: Number(form.base_fare),
        per_km_rate: Number(form.per_km_rate),
        per_minute_rate: Number(form.per_minute_rate),
        cancellation_fee: Number(form.cancellation_fee),
        is_active: form.is_active,
    })

    const handleSubmit = async (event) => {
        event.preventDefault()

        const validationError = validateForm()
        if (validationError) {
            Swal.fire('Validation Error', validationError, 'warning')
            return
        }

        try {
            setSaving(true)
            const payload = normalizePayload()

            if (editingId) {
                await updateFareConfig(token, editingId, payload)
                Swal.fire('Success', 'Fare configuration updated successfully', 'success')
            } else {
                await createFareConfig(token, payload)
                Swal.fire('Success', 'Fare configuration created successfully', 'success')
            }

            resetForm()
            setModalOpen(false)
            await loadFareConfigs()
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to save fare configuration', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (item) => {
        setEditingId(item.id)
        setForm({
            vehicle_type: item.vehicle_type || '',
            base_fare: String(item.base_fare ?? '0'),
            per_km_rate: String(item.per_km_rate ?? '0'),
            per_minute_rate: String(item.per_minute_rate ?? '0'),
            cancellation_fee: String(item.cancellation_fee ?? '0'),
            is_active: Boolean(item.is_active),
        })
        setModalOpen(true)
    }

    return (
        <section className="content-page fare-configs-page">
            <div className="top-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
                <div className="stats-summary" style={{ margin: 0, flex: 1, flexWrap: 'nowrap', overflowX: 'auto' }}>
                    <div className="stat-pill">
                        Total Fare Configs: <strong>{fareConfigs.length}</strong>
                    </div>
                    <div className="stat-pill">
                        Active: <strong>{activeCount}</strong>
                    </div>
                    <div className="stat-pill">
                        Inactive: <strong>{inactiveCount}</strong>
                    </div>
                </div>

                <div className="fare-configs-toolbar">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search by vehicle type..."
                    />
                    <button type="button" className="btn-view" title="Add fare configuration" aria-label="Add fare configuration" onClick={openCreateModal}>
                        <span className="material-icons">add</span>
                    </button>
                </div>
            </div>

            <DataTable
                headers={['Vehicle Type', 'Base', 'Per KM', 'Per Min', 'Cancel Fee', 'Status', 'Action']}
                gridTemplate="1.2fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr 0.9fr"
            >
                {loading ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.2fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr 0.9fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                            Loading fare configurations...
                        </span>
                    </div>
                ) : filteredFareConfigs.length === 0 ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.2fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr 0.9fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                            No fare configurations found.
                        </span>
                    </div>
                ) : (
                    filteredFareConfigs.map((item) => (
                        <div
                            className="table-row"
                            key={item.id}
                            style={{ gridTemplateColumns: '1.2fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr 0.9fr' }}
                        >
                            <div className="fare-config-vehicle-type">{item.vehicle_type}</div>
                            <div>LKR {formatMoney(item.base_fare)}</div>
                            <div>LKR {formatMoney(item.per_km_rate)}</div>
                            <div>LKR {formatMoney(item.per_minute_rate)}</div>
                            <div>LKR {formatMoney(item.cancellation_fee)}</div>
                            <div>
                                <span className={`badge-status ${item.is_active ? 'active' : 'pending'}`}>
                                    {item.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="cell-actions">
                                <button
                                    type="button"
                                    className="btn-view"
                                    title="Edit fare configuration"
                                    aria-label="Edit fare configuration"
                                    onClick={() => handleEdit(item)}
                                >
                                    <span className="material-icons">edit</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </DataTable>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingId ? 'Update Fare Configuration' : 'Add Fare Configuration'}
                subtitle={editingId ? 'Modify the fare settings' : 'Create a new fare configuration'}
                size="medium"
            >
                <div style={{ display: 'grid', gap: '16px' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="vehicle_type" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted, #64748b)' }}>
                            Vehicle Type *
                        </label>
                        <select
                            id="vehicle_type"
                            name="vehicle_type"
                            value={form.vehicle_type}
                            onChange={handleFormChange}
                            required
                            disabled={saving}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border, #e2e8f0)',
                                borderRadius: '8px',
                                background: '#ffffff',
                                color: 'var(--text-dark, #1e293b)',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                fontFamily: 'var(--sans)'
                            }}
                        >
                            <option value="">Select a vehicle type</option>
                            {vehicleTypes.map((type) => (
                                <option key={type.id} value={type.name}>
                                    {type.display_name} ({type.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '0' }}>
                        <FormInput
                            label="Base Fare (LKR)"
                            name="base_fare"
                            type="number"
                            placeholder="0.00"
                            value={form.base_fare}
                            onChange={handleFormChange}
                            required
                            disabled={saving}
                            step="0.01"
                            min="0"
                        />
                        <FormInput
                            label="Per KM Rate (LKR)"
                            name="per_km_rate"
                            type="number"
                            placeholder="0.00"
                            value={form.per_km_rate}
                            onChange={handleFormChange}
                            required
                            disabled={saving}
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '0' }}>
                        <FormInput
                            label="Per Minute Rate (LKR)"
                            name="per_minute_rate"
                            type="number"
                            placeholder="0.00"
                            value={form.per_minute_rate}
                            onChange={handleFormChange}
                            required
                            disabled={saving}
                            step="0.01"
                            min="0"
                        />
                        <FormInput
                            label="Cancellation Fee (LKR)"
                            name="cancellation_fee"
                            type="number"
                            placeholder="0.00"
                            value={form.cancellation_fee}
                            onChange={handleFormChange}
                            required
                            disabled={saving}
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <input
                            id="is_active"
                            name="is_active"
                            type="checkbox"
                            checked={form.is_active}
                            onChange={handleFormChange}
                            disabled={saving}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="is_active" style={{ margin: 0, cursor: 'pointer', fontWeight: '500', color: 'var(--text-dark, #1e293b)' }}>
                            Active fare for this vehicle type
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                    <button
                        type="button"
                        onClick={closeModal}
                        disabled={saving}
                        style={{
                            padding: '10px 20px',
                            background: '#f1f3f5',
                            color: 'var(--text-dark, #1e293b)',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving}
                        style={{
                            padding: '10px 20px',
                            background: '#000000',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving && <span className="material-icons" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>sync</span>}
                        {editingId ? 'Update Fare Config' : 'Add Fare Config'}
                    </button>
                </div>
            </Modal>
        </section>
    )
}

export default FareConfigs

