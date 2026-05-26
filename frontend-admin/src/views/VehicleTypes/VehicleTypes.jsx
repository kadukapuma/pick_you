import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../../context/AdminContext'
import DataTable from '../../components/DataTable/DataTable'
import SearchBar from '../../components/SearchBar/SearchBar'
import Modal from '../../components/Modal/Modal'
import FormInput from '../../components/FormInput/FormInput'
import VehicleTypeIcon from '../../components/VehicleTypeIcon/VehicleTypeIcon'
import {
    createVehicleType,
    fetchVehicleTypes,
    updateVehicleType,
    deleteVehicleType,
} from '../../services/adminApi'
import './VehicleTypes.css'

const defaultForm = {
    name: '',
    display_name: '',
    description: '',
    is_active: true,
}

const VehicleTypes = () => {
    const { token } = useAdmin()
    const [vehicleTypes, setVehicleTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [isModalOpen, setModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)

    const loadVehicleTypes = async () => {
        if (!token) return

        try {
            setLoading(true)
            const response = await fetchVehicleTypes(token)
            setVehicleTypes(response.vehicleTypes || [])
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to fetch vehicle types', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!token) {
            setVehicleTypes([])
            setLoading(false)
            return
        }

        loadVehicleTypes()
    }, [token])

    const filteredVehicleTypes = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return vehicleTypes

        return vehicleTypes.filter((item) =>
            String(item.name || '').toLowerCase().includes(query) ||
            String(item.display_name || '').toLowerCase().includes(query) ||
            String(item.description || '').toLowerCase().includes(query)
        )
    }, [vehicleTypes, search])

    const activeCount = useMemo(
        () => vehicleTypes.filter((item) => Boolean(item.is_active)).length,
        [vehicleTypes],
    )

    const inactiveCount = useMemo(
        () => vehicleTypes.filter((item) => !item.is_active).length,
        [vehicleTypes],
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

    const handleFormChange = (event) => {
        const { name, value, type, checked } = event.target
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const validateForm = () => {
        if (!form.name.trim()) {
            return 'Unique reference name is required.'
        }
        if (!/^[a-z0-9_]+$/.test(form.name.trim())) {
            return 'Reference name must contain only lowercase letters, numbers, and underscores (e.g. suv, mini_car).'
        }
        if (!form.display_name.trim()) {
            return 'Display name is required.'
        }
        return null
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const validationError = validateForm()
        if (validationError) {
            Swal.fire('Validation Error', validationError, 'warning')
            return
        }

        try {
            setSaving(true)
            const payload = {
                name: form.name.trim().toLowerCase(),
                display_name: form.display_name.trim(),
                description: form.description.trim(),
                is_active: Boolean(form.is_active),
            }

            if (editingId) {
                await updateVehicleType(token, editingId, payload)
                Swal.fire('Success', 'Vehicle type updated successfully', 'success')
            } else {
                await createVehicleType(token, payload)
                Swal.fire('Success', 'Vehicle type created successfully', 'success')
            }

            resetForm()
            setModalOpen(false)
            await loadVehicleTypes()
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to save vehicle type', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (item) => {
        setEditingId(item.id)
        setForm({
            name: item.name || '',
            display_name: item.display_name || '',
            description: item.description || '',
            is_active: Boolean(item.is_active),
        })
        setModalOpen(true)
    }

    const handleDelete = async (item) => {
        Swal.fire({
            title: `Delete ${item.display_name}?`,
            text: "This action cannot be undone. It will only succeed if the type is not in active use.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await deleteVehicleType(token, item.id)
                    Swal.fire('Deleted!', 'Vehicle type has been deleted.', 'success')
                    await loadVehicleTypes()
                } catch (error) {
                    Swal.fire('Failed', error.message || 'Could not delete this type.', 'error')
                }
            }
        })
    }

    return (
        <section className="content-page vehicle-types-page">
            <div className="top-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
                <div className="stats-summary" style={{ margin: 0, flex: 1, flexWrap: 'nowrap', overflowX: 'auto' }}>
                    <div className="stat-pill">
                        Total Vehicle Types: <strong>{vehicleTypes.length}</strong>
                    </div>
                    <div className="stat-pill">
                        Active: <strong>{activeCount}</strong>
                    </div>
                    <div className="stat-pill">
                        Inactive: <strong>{inactiveCount}</strong>
                    </div>
                </div>

                <div className="vehicle-types-toolbar">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search vehicle types..."
                    />
                    <button type="button" className="btn-view" title="Add vehicle type" aria-label="Add vehicle type" onClick={openCreateModal}>
                        <span className="material-icons">add</span>
                    </button>
                </div>
            </div>

            <DataTable
                headers={['Reference Name', 'Display Name', 'Description', 'Status', 'Action']}
                gridTemplate="1.2fr 1.5fr 2fr 0.8fr 1fr"
            >
                {loading ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.2fr 1.5fr 2fr 0.8fr 1fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                            Loading vehicle types...
                        </span>
                    </div>
                ) : filteredVehicleTypes.length === 0 ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.2fr 1.5fr 2fr 0.8fr 1fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                            No vehicle types found.
                        </span>
                    </div>
                ) : (
                    filteredVehicleTypes.map((item) => (
                        <div
                            className="table-row"
                            key={item.id}
                            style={{ gridTemplateColumns: '1.2fr 1.5fr 2fr 0.8fr 1fr' }}
                        >
                            <div className="vehicle-type-name">
                                <VehicleTypeIcon type={item} showLabel />
                            </div>
                            <div>{item.display_name}</div>
                            <div className="vehicle-type-desc" title={item.description}>{item.description || 'N/A'}</div>
                            <div>
                                <span className={`badge-status ${item.is_active ? 'active' : 'pending'}`}>
                                    {item.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="cell-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    className="btn-view"
                                    title="Edit vehicle type"
                                    aria-label="Edit vehicle type"
                                    onClick={() => handleEdit(item)}
                                >
                                    <span className="material-icons">edit</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-view"
                                    title="Delete vehicle type"
                                    aria-label="Delete vehicle type"
                                    onClick={() => handleDelete(item)}
                                    style={{ backgroundColor: '#ef4444' }}
                                >
                                    <span className="material-icons">delete</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </DataTable>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingId ? 'Update Vehicle Type' : 'Add Vehicle Type'}
                subtitle={editingId ? 'Modify the vehicle type properties' : 'Create a new vehicle type option'}
                size="medium"
            >
                <div style={{ display: 'grid', gap: '16px' }}>
                    <FormInput
                        label="Reference Name (e.g. suv, mini_car)"
                        name="name"
                        placeholder="lowercase letters, numbers, and underscores only"
                        value={form.name}
                        onChange={handleFormChange}
                        required
                        disabled={saving || editingId !== null}
                    />

                    <FormInput
                        label="Display Name"
                        name="display_name"
                        placeholder="e.g. SUV, Mini Car"
                        value={form.display_name}
                        onChange={handleFormChange}
                        required
                        disabled={saving}
                    />

                    <div className="vehicle-type-icon-preview">
                        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted, #64748b)' }}>
                            Reference Icon Preview
                        </label>
                        <div style={{ marginTop: '8px' }}>
                            <VehicleTypeIcon
                                type={form.name || form.display_name}
                                showLabel
                                style={{ background: '#f0fdfa', borderColor: '#ccfbf1' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="description" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted, #64748b)' }}>
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            placeholder="Provide a description for this vehicle type..."
                            value={form.description}
                            onChange={handleFormChange}
                            disabled={saving}
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                boxSizing: 'border-box',
                                border: '1px solid var(--border, #e2e8f0)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '14px',
                                color: 'var(--text-dark, #1e293b)',
                                resize: 'vertical',
                                outline: 'none',
                                fontFamily: 'var(--sans)'
                            }}
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
                            Active and selectable
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
                        {editingId ? 'Update Vehicle Type' : 'Add Vehicle Type'}
                    </button>
                </div>
            </Modal>
        </section>
    )
}

export default VehicleTypes
