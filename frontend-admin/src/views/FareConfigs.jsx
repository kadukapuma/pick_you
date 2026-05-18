import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../context/AdminContext'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import {
    createFareConfig,
    fetchFareConfigs,
    updateFareConfig,
} from '../services/adminApi'
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

    useEffect(() => {
        if (!token) {
            setFareConfigs([])
            setLoading(false)
            return
        }

        loadFareConfigs()
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
                    <button type="button" className="btn-view" onClick={openCreateModal}>
                        <span className="material-icons">add</span>
                        Add Fare
                    </button>
                </div>
            </div>

            <DataTable
                headers={['Vehicle Type', 'Base', 'Per KM', 'Per Min', 'Cancel Fee', 'Status', 'Actions']}
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
                                    onClick={() => handleEdit(item)}
                                >
                                    <span className="material-icons">edit</span>
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </DataTable>

            {isModalOpen && (
                <div className="fare-config-modal-overlay" onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        closeModal()
                    }
                }}>
                    <div className="fare-config-card fare-config-modal-card">
                        <div className="fare-config-card-header">
                            <h3>{editingId ? 'Update Fare Configuration' : 'Add Fare Configuration'}</h3>
                            <button type="button" className="btn-view fare-config-btn-alt" onClick={closeModal}>
                                Close
                            </button>
                        </div>

                        <form className="fare-config-form" onSubmit={handleSubmit}>
                            <div className="fare-config-form-row single">
                                <label htmlFor="vehicle_type">Vehicle Type</label>
                                <input
                                    id="vehicle_type"
                                    name="vehicle_type"
                                    type="text"
                                    value={form.vehicle_type}
                                    onChange={handleChange}
                                    placeholder="e.g. car, bike, tuk"
                                    required
                                />
                            </div>

                            <div className="fare-config-form-row">
                                <div>
                                    <label htmlFor="base_fare">Base Fare</label>
                                    <input
                                        id="base_fare"
                                        name="base_fare"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.base_fare}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="per_km_rate">Per KM Rate</label>
                                    <input
                                        id="per_km_rate"
                                        name="per_km_rate"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.per_km_rate}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="fare-config-form-row">
                                <div>
                                    <label htmlFor="per_minute_rate">Per Minute Rate</label>
                                    <input
                                        id="per_minute_rate"
                                        name="per_minute_rate"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.per_minute_rate}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="cancellation_fee">Cancellation Fee</label>
                                    <input
                                        id="cancellation_fee"
                                        name="cancellation_fee"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.cancellation_fee}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <label className="fare-config-checkbox" htmlFor="is_active">
                                <input
                                    id="is_active"
                                    name="is_active"
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={handleChange}
                                />
                                Active fare for this vehicle type
                            </label>

                            <div className="fare-config-actions">
                                <button type="submit" className="btn-view" disabled={saving}>
                                    {saving
                                        ? editingId
                                            ? 'Updating...'
                                            : 'Saving...'
                                        : editingId
                                            ? 'Update Fare Config'
                                            : 'Add Fare Config'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    )
}

export default FareConfigs
