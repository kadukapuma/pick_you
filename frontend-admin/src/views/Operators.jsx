import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../context/AdminContext'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import { createOperator, fetchOperators } from '../services/adminApi'
import './Permissions.css'

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

    const canCreateOperators = admin?.role === 'super_admin' || hasPermission('create_operators')

    useEffect(() => {
        const loadOperators = async () => {
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
        }

        loadOperators()
    }, [token, page, pagination.perPage])

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

    const handleCreateOperator = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Create New Operator',
            html:
                '<input id="operator-input1" class="swal2-input" placeholder="First Name">' +
                '<input id="operator-input2" class="swal2-input" placeholder="Last Name">' +
                '<input id="operator-input3" class="swal2-input" placeholder="Email">' +
                '<input id="operator-input4" class="swal2-input" placeholder="Phone">' +
                '<input id="operator-input5" type="password" class="swal2-input" placeholder="Password">' +
                '<input id="operator-input6" type="password" class="swal2-input" placeholder="Confirm Password">',
            focusConfirm: false,
            preConfirm: () => ({
                first_name: document.getElementById('operator-input1').value,
                last_name: document.getElementById('operator-input2').value,
                email: document.getElementById('operator-input3').value,
                phone: document.getElementById('operator-input4').value,
                password: document.getElementById('operator-input5').value,
                password_confirmation: document.getElementById('operator-input6').value,
            }),
        })

        if (!formValues) return

        try {
            await createOperator(token, formValues)
            Swal.fire('Success', 'Operator created successfully', 'success')
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
            Swal.fire('Error', error.message || 'Failed to create operator', 'error')
        }
    }

    if (!canCreateOperators) {
        return (
            <section className="content-page">
                <div className="permissions-empty-state">
                    <h2>Access restricted</h2>
                    <p>You do not have permission to create operators.</p>
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
                <button className="btn-signin" style={{ width: 'auto', padding: '12px 24px' }} onClick={handleCreateOperator}>
                    <span className="material-icons" style={{ marginRight: 8 }}>add</span>
                    Add Operator
                </button>
            </div>

            <DataTable
                headers={['Name', 'Contact', 'Role', 'Status']}
                gridTemplate="1.5fr 2fr 1fr 1fr"
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                    perPage: pagination.perPage,
                    onPageChange: setPage,
                }}
            >
                {loading ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Loading operators...</span>
                    </div>
                ) : filteredOperators.length === 0 ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No operators found.</span>
                    </div>
                ) : (
                    filteredOperators.map((operator) => (
                        <div className="table-row" key={operator.id} style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr' }}>
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
                                <span className={`badge-status ${operator.is_active ? 'approved' : 'pending'}`}>
                                    {operator.is_active ? 'Active' : 'Suspended'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </DataTable>
        </section>
    )
}

export default Operators
