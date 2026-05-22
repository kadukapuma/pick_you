import { useCallback, useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../../context/AdminContext'
import DataTable from '../../components/DataTable/DataTable'
import SearchBar from '../../components/SearchBar/SearchBar'
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton'
import Modal from '../../components/Modal/Modal'
import FormInput from '../../components/FormInput/FormInput'
import FormActions from '../../components/FormActions/FormActions'
import {
    createOperator,
    deleteOperator,
    fetchOperators,
    updateOperator,
    updateOperatorStatus,
} from '../../services/adminApi'
import './Operators.css'

const Operators = () => {
    const { token, hasPermission, admin } = useAdmin()
    const [operators, setOperators] = useState([])
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: 10,
        total: 0,
        totalPages: 1,
    })
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditingOperator, setIsEditingOperator] = useState(false)
    const [editingOperatorId, setEditingOperatorId] = useState(null)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formErrors, setFormErrors] = useState({})

    const canCreateOperators = admin?.role === 'super_admin' || hasPermission('create_operators')
    const canManageOperators = admin?.role === 'super_admin' || hasPermission('manage_operators')
    const canAccessOperators = canCreateOperators || canManageOperators

    const loadOperators = useCallback(async () => {
        if (!token) return

        try {
            setLoading(true)
            const response = await fetchOperators(token, {
                page,
                perPage: pagination.perPage,
            })
            setOperators(response.operators || [])
            if (response.pagination) {
                setPagination((prev) => ({
                    ...prev,
                    ...response.pagination,
                }))
            }
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to fetch operators', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, pagination.perPage, token])

    useEffect(() => {
        loadOperators()
    }, [loadOperators])

    const filteredOperators = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return operators

        return operators.filter((operator) => {
            return [
                operator.first_name,
                operator.last_name,
                operator.email,
                operator.phone,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query))
        })
    }, [operators, search])

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            password: '',
            password_confirmation: '',
        })
        setFormErrors({})
    }

    const handleCreateOperator = () => {
        setIsEditingOperator(false)
        setEditingOperatorId(null)
        resetForm()
        setIsModalOpen(true)
    }

    const handleEditOperator = (operator) => {
        setIsEditingOperator(true)
        setEditingOperatorId(operator.id)
        setFormData({
            first_name: operator.first_name || '',
            last_name: operator.last_name || '',
            email: operator.email || '',
            phone: operator.phone || '',
            password: '',
            password_confirmation: '',
        })
        setFormErrors({})
        setIsModalOpen(true)
    }

    const handleFormChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
        if (formErrors[name]) {
            setFormErrors((prev) => ({
                ...prev,
                [name]: '',
            }))
        }
    }

    const validateForm = () => {
        const errors = {}
        if (!formData.first_name.trim()) errors.first_name = 'First name is required'
        if (!formData.last_name.trim()) errors.last_name = 'Last name is required'
        if (!formData.email.trim()) errors.email = 'Email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format'
        if (!formData.phone.trim()) errors.phone = 'Phone is required'

        if (!isEditingOperator) {
            if (!formData.password) errors.password = 'Password is required'
            if (!formData.password_confirmation) errors.password_confirmation = 'Confirm password is required'
            if (formData.password !== formData.password_confirmation) {
                errors.password_confirmation = 'Passwords do not match'
            }
        }

        return errors
    }

    const handleSubmitForm = async () => {
        const errors = validateForm()
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            return
        }

        setIsSubmitting(true)
        try {
            if (isEditingOperator) {
                await updateOperator(token, editingOperatorId, {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    email: formData.email,
                    phone: formData.phone,
                })
            } else {
                await createOperator(token, formData)
            }

            Swal.fire({
                title: 'Success',
                text: isEditingOperator ? 'Operator updated successfully' : 'Operator created successfully',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
            })
            setIsModalOpen(false)
            setEditingOperatorId(null)
            setIsEditingOperator(false)
            resetForm()
            await loadOperators()
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to save operator', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCloseModal = () => {
        if (!isSubmitting) {
            setIsModalOpen(false)
            setEditingOperatorId(null)
            setIsEditingOperator(false)
            resetForm()
        }
    }

    const handleToggleStatus = async (operator) => {
        const action = operator.is_active ? 'suspend' : 'activate'

        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} account?`,
            text: `Are you sure you want to ${action} this operator's login access?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: operator.is_active ? '#fa5252' : '#0ca678',
            cancelButtonColor: '#adb5bd',
            confirmButtonText: `Yes, ${action} it!`,
        })

        if (!result.isConfirmed) return

        try {
            await updateOperatorStatus(token, operator.id, !operator.is_active)
            Swal.fire({
                title: 'Status Updated',
                text: `Operator account has been ${!operator.is_active ? 'activated' : 'suspended'}.`,
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
            })
            await loadOperators()
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to update status', 'error')
        }
    }

    const handleDeleteOperator = async (operatorId) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#fa5252',
            cancelButtonColor: '#adb5bd',
            confirmButtonText: 'Yes, delete it!',
        })

        if (!result.isConfirmed) return

        try {
            await deleteOperator(token, operatorId)
            Swal.fire('Deleted!', 'Operator has been deleted.', 'success')
            await loadOperators()
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to delete operator', 'error')
        }
    }

    if (!canAccessOperators) {
        return (
            <section className="content-page">
                <div className="permissions-empty-state">
                    <h2>Access restricted</h2>
                    <p>You do not have permission to manage operators.</p>
                </div>
            </section>
        )
    }

    return (
        <section className="content-page">
            <div className="top-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search operators..."
                    />
                </div>
                {canCreateOperators && (
                    <PrimaryButton icon="add" onClick={handleCreateOperator}>
                        Add Operator
                    </PrimaryButton>
                )}
            </div>

            <DataTable
                headers={['Name', 'Contact', 'Role', 'Status', 'Action']}
                gridTemplate="1.5fr 2fr 1fr 1fr 1.5fr"
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                    perPage: pagination.perPage,
                    onPageChange: setPage,
                }}
            >
                {loading ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1.5fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Loading operators...</span>
                    </div>
                ) : filteredOperators.length === 0 ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1.5fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No operators found.</span>
                    </div>
                ) : (
                    filteredOperators.map((operator) => (
                        <div className="table-row" key={operator.id} style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1.5fr' }}>
                            <div className="cell-driver">
                                <div className="avatar-initials">
                                    {operator.first_name?.charAt(0)}
                                </div>
                                <div className="driver-info">
                                    <h4>{operator.first_name} {operator.last_name}</h4>
                                    <p>ID: #{operator.id}</p>
                                </div>
                            </div>
                            <div className="cell-contact">
                                <p style={{ fontSize: '13px', marginBottom: 4 }}>{operator.email}</p>
                                <p style={{ fontSize: '12px', color: '#868e96' }}>{operator.phone}</p>
                            </div>
                            <div className="cell-status">
                                <span className="badge-status active" style={{ background: '#e7f5ff', color: '#228be6' }}>
                                    {operator.role}
                                </span>
                            </div>
                            <div className="cell-status">
                                <button
                                    type="button"
                                    className={`badge-status ${operator.is_active ? 'approved' : 'pending'}`}
                                    style={{ border: 'none', cursor: canManageOperators ? 'pointer' : 'default', outline: 'none' }}
                                    onClick={() => canManageOperators && handleToggleStatus(operator)}
                                    disabled={!canManageOperators}
                                >
                                    {operator.is_active ? 'Active' : 'Suspended'}
                                </button>
                            </div>
                            <div className="cell-actions operator-actions">
                                {canManageOperators ? (
                                    <>
                                        <button
                                            type="button"
                                            className="btn-view icon-action-button icon-action-edit"
                                            title="Edit operator"
                                            aria-label="Edit operator"
                                            onClick={() => handleEditOperator(operator)}
                                        >
                                            <span className="material-icons">edit</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-view icon-action-button icon-action-delete"
                                            title="Delete operator"
                                            aria-label="Delete operator"
                                            onClick={() => handleDeleteOperator(operator.id)}
                                        >
                                            <span className="material-icons">delete</span>
                                        </button>
                                    </>
                                ) : (
                                    <span className="muted" style={{ fontSize: 12 }}>No actions available</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </DataTable>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isEditingOperator ? 'Edit Operator' : 'Create New Operator'}
                subtitle={isEditingOperator ? 'Update operator details' : 'Add a new operator to manage rides'}
                size="medium"
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <FormInput
                        label="First Name"
                        name="first_name"
                        placeholder="Enter first name"
                        value={formData.first_name}
                        onChange={handleFormChange}
                        error={formErrors.first_name}
                        required
                        disabled={isSubmitting}
                    />
                    <FormInput
                        label="Last Name"
                        name="last_name"
                        placeholder="Enter last name"
                        value={formData.last_name}
                        onChange={handleFormChange}
                        error={formErrors.last_name}
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <FormInput
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={handleFormChange}
                        error={formErrors.email}
                        required
                        disabled={isSubmitting}
                    />
                    <FormInput
                        label="Phone"
                        name="phone"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={handleFormChange}
                        error={formErrors.phone}
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '0' }}>
                    {!isEditingOperator ? (
                        <>
                            <FormInput
                                label="Password"
                                name="password"
                                type="password"
                                placeholder="Enter password"
                                value={formData.password}
                                onChange={handleFormChange}
                                error={formErrors.password}
                                required
                                disabled={isSubmitting}
                            />
                            <FormInput
                                label="Confirm Password"
                                name="password_confirmation"
                                type="password"
                                placeholder="Confirm password"
                                value={formData.password_confirmation}
                                onChange={handleFormChange}
                                error={formErrors.password_confirmation}
                                required
                                disabled={isSubmitting}
                            />
                        </>
                    ) : (
                        <div style={{ gridColumn: '1 / -1', color: '#6c757d', fontSize: 13 }}>
                            Password changes are not available from this screen.
                        </div>
                    )}
                </div>
                <FormActions
                    onSubmit={handleSubmitForm}
                    onCancel={handleCloseModal}
                    submitLabel={isEditingOperator ? 'Save Changes' : 'Create Operator'}
                    cancelLabel="Cancel"
                    isLoading={isSubmitting}
                />
            </Modal>
        </section>
    )
}

export default Operators
