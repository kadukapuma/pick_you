import { useState, useEffect, useMemo } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { apiFetch, fetchAdmins, updateAdminStatus } from '../../services/adminApi'
import DataTable from '../../components/DataTable/DataTable'
import SearchBar from '../../components/SearchBar/SearchBar'
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton'
import Modal from '../../components/Modal/Modal'
import FormInput from '../../components/FormInput/FormInput'
import FormActions from '../../components/FormActions/FormActions'
import Swal from 'sweetalert2'

const Admins = () => {
    const { token } = useAdmin()
    const [admins, setAdmins] = useState([])
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

    const loadAdmins = async () => {
        try {
            setLoading(true)
            const response = await fetchAdmins(token, {
                page,
                perPage: pagination.perPage,
            })
            setAdmins(response.admins || [])
            if (response.pagination) {
                setPagination((prev) => ({
                    ...prev,
                    ...response.pagination,
                }))
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to fetch admins', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!token) {
            setAdmins([])
            setPagination({ page: 1, perPage: 10, total: 0, totalPages: 1 })
            setPage(1)
            return
        }

        loadAdmins()
    }, [token, page])

    const filteredAdmins = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return admins

        return admins.filter((admin) => {
            return [
                admin.first_name,
                admin.last_name,
                admin.email,
                admin.phone,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query))
        })
    }, [admins, search])

    const handleToggleStatus = async (id, currentStatus) => {
        const action = currentStatus ? 'suspend' : 'activate'

        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} account?`,
            text: `Are you sure you want to ${action} this administrator's login access?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#fa5252' : '#0ca678',
            cancelButtonColor: '#adb5bd',
            confirmButtonText: `Yes, ${action} it!`
        })

        if (!result.isConfirmed) return

        const newStatus = !currentStatus
        try {
            await updateAdminStatus(id, newStatus, token)
            setAdmins(admins.map(admin =>
                admin.id === id ? { ...admin, is_active: newStatus } : admin
            ))
            Swal.fire({
                title: 'Status Updated',
                text: `Admin account has been ${newStatus ? 'activated' : 'suspended'}.`,
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            })
        } catch (error) {
            Swal.fire('Error', 'Failed to update status', 'error')
        }
    }

    const handleAddAdmin = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            password: '',
            password_confirmation: '',
        })
        setFormErrors({})
        setIsModalOpen(true)
    }

    const handleFormChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
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
        if (!formData.password) errors.password = 'Password is required'
        if (!formData.password_confirmation) errors.password_confirmation = 'Confirm password is required'
        if (formData.password !== formData.password_confirmation) {
            errors.password_confirmation = 'Passwords do not match'
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
            await apiFetch('/admins', {
                method: 'POST',
                token,
                body: formData
            })
            Swal.fire({
                title: 'Success',
                text: 'Admin created successfully',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            })
            setIsModalOpen(false)
            loadAdmins()
        } catch (error) {
            Swal.fire('Error', error.message, 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCloseModal = () => {
        if (!isSubmitting) {
            setIsModalOpen(false)
        }
    }

    const handleDeleteAdmin = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#fa5252',
            cancelButtonColor: '#adb5bd',
            confirmButtonText: 'Yes, delete it!'
        })

        if (result.isConfirmed) {
            try {
                await apiFetch(`/admins/${id}`, {
                    method: 'DELETE',
                    token
                })
                Swal.fire('Deleted!', 'Admin has been deleted.', 'success')
                loadAdmins()
            } catch (error) {
                Swal.fire('Error', error.message, 'error')
            }
        }
    }

    return (
        <section className="content-page">
            <div className="top-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search name, email or phone..."
                    />
                </div>
                <PrimaryButton icon="add" onClick={handleAddAdmin}>
                    Add Admin
                </PrimaryButton>
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
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Loading admins...</span>
                    </div>
                ) : filteredAdmins.length === 0 ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1.5fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No admins found.</span>
                    </div>
                ) : (
                    filteredAdmins.map((admin) => (
                        <div className="table-row" key={admin.id} style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1.5fr' }}>
                            <div className="cell-driver">
                                <div className="avatar-initials">
                                    {admin.first_name?.charAt(0)}
                                </div>
                                <div className="driver-info">
                                    <h4>{admin.first_name} {admin.last_name}</h4>
                                    <p>ID: #{admin.id}</p>
                                </div>
                            </div>
                            <div className="cell-contact">
                                <p style={{ fontSize: '13px', marginBottom: 4 }}>{admin.email}</p>
                                <p style={{ fontSize: '12px', color: '#868e96' }}>{admin.phone}</p>
                            </div>
                            <div className="cell-status">
                                <span className="badge-status active" style={{ background: '#e7f5ff', color: '#228be6' }}>
                                    {admin.role}
                                </span>
                            </div>
                            <div className="cell-status">
                                <button
                                    className={`badge-status ${admin.is_active ? 'approved' : 'pending'}`}
                                    style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                                    onClick={() => handleToggleStatus(admin.id, admin.is_active)}
                                >
                                    {admin.is_active ? 'Active' : 'Suspended'}
                                </button>
                            </div>
                            <div className="cell-actions">
                                <button
                                    type="button"
                                    className="btn-view"
                                    style={{ background: '#fff5f5', color: '#fa5252', border: '1px solid #ffe3e3' }}
                                    title="Delete admin"
                                    aria-label="Delete admin"
                                    onClick={() => handleDeleteAdmin(admin.id)}
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
                onClose={handleCloseModal}
                title="Add New Admin"
                subtitle="Create a new administrator account"
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
                </div>
                <FormActions
                    onSubmit={handleSubmitForm}
                    onCancel={handleCloseModal}
                    submitLabel="Create Admin"
                    cancelLabel="Cancel"
                    isLoading={isSubmitting}
                />
            </Modal>
        </section>
    )
}

export default Admins

