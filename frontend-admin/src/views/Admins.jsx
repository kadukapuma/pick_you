import { useState, useEffect, useMemo } from 'react'
import { useAdmin } from '../context/AdminContext'
import { apiFetch, fetchAdmins, updateAdminStatus } from '../services/adminApi'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
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
        const action = currentStatus ? 'suspend' : 'activate';

        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} account?`,
            text: `Are you sure you want to ${action} this administrator's login access?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#fa5252' : '#0ca678',
            cancelButtonColor: '#adb5bd',
            confirmButtonText: `Yes, ${action} it!`
        });

        if (!result.isConfirmed) return;

        const newStatus = !currentStatus;
        try {
            await updateAdminStatus(id, newStatus, token);
            setAdmins(admins.map(admin =>
                admin.id === id ? { ...admin, is_active: newStatus } : admin
            ));
            Swal.fire({
                title: 'Status Updated',
                text: `Admin account has been ${newStatus ? 'activated' : 'suspended'}.`,
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (error) {
            Swal.fire('Error', 'Failed to update status', 'error');
        }
    }

    const handleAddAdmin = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Add New Admin',
            html:
                '<input id="swal-input1" class="swal2-input" placeholder="First Name">' +
                '<input id="swal-input2" class="swal2-input" placeholder="Last Name">' +
                '<input id="swal-input3" class="swal2-input" placeholder="Email">' +
                '<input id="swal-input4" class="swal2-input" placeholder="Phone">' +
                '<input id="swal-input5" type="password" class="swal2-input" placeholder="Password">' +
                '<input id="swal-input6" type="password" class="swal2-input" placeholder="Confirm Password">',
            focusConfirm: false,
            preConfirm: () => {
                return {
                    first_name: document.getElementById('swal-input1').value,
                    last_name: document.getElementById('swal-input2').value,
                    email: document.getElementById('swal-input3').value,
                    phone: document.getElementById('swal-input4').value,
                    password: document.getElementById('swal-input5').value,
                    password_confirmation: document.getElementById('swal-input6').value,
                }
            }
        })

        if (formValues) {
            try {
                await apiFetch('/admins', {
                    method: 'POST',
                    token,
                    body: formValues
                })
                Swal.fire('Success', 'Admin created successfully', 'success')
                loadAdmins()
            } catch (error) {
                Swal.fire('Error', error.message, 'error')
            }
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
                <button className="btn-signin" style={{ width: 'auto', padding: '12px 24px' }} onClick={handleAddAdmin}>
                    <span className="material-icons" style={{ marginRight: 8 }}>add</span>
                    Add Admin
                </button>
            </div>

            <DataTable
                headers={['Name', 'Contact', 'Role', 'Status', 'Actions']}
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
                                    onClick={() => handleDeleteAdmin(admin.id)}
                                >
                                    <span className="material-icons">delete</span>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </DataTable>
        </section>
    )
}

export default Admins
