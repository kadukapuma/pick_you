import { useState, useEffect, useMemo } from 'react'
import { useAdmin } from '../context/AdminContext'
import echo from '../echo'
import { fetchPassengers, updatePassengerStatus } from '../services/adminApi'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import Swal from 'sweetalert2'

const Passengers = () => {
    const { token } = useAdmin()
    const [passengers, setPassengers] = useState([])
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: 10,
        total: 0,
        totalPages: 1,
    })
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const loadPassengers = async () => {
        try {
            setLoading(true)
            const response = await fetchPassengers(token, {
                page,
                perPage: pagination.perPage,
            })
            setPassengers(response.passengers || [])
            if (response.pagination) {
                setPagination((prev) => ({
                    ...prev,
                    ...response.pagination,
                }))
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to fetch passengers', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!token) {
            setPassengers([])
            setPagination({ page: 1, perPage: 10, total: 0, totalPages: 1 })
            setPage(1)
            return
        }

        loadPassengers()
    }, [token, page])

    useEffect(() => {
        if (!token) return

        const channel = echo.channel('admin.passengers')
        const handleCreated = (payload) => {
            const nextPassenger = payload?.passenger ?? payload
            if (!nextPassenger?.id) return

            setPassengers((prev) => {
                const exists = prev.some((p) => p.id === nextPassenger.id)
                if (exists) {
                    return prev.map((p) => (p.id === nextPassenger.id ? nextPassenger : p))
                }
                setPagination((prevPagination) => ({
                    ...prevPagination,
                    total: prevPagination.total + 1,
                }))
                if (page !== 1) {
                    return prev
                }
                return [nextPassenger, ...prev]
            })
        }

        channel.listen('PassengerCreated', handleCreated)

        return () => {
            channel.stopListening('PassengerCreated', handleCreated)
            echo.leave('admin.passengers')
        }
    }, [token])

    const filteredPassengers = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return passengers

        return passengers.filter((p) => {
            return [
                p.user?.first_name,
                p.user?.last_name,
                p.user?.email,
                p.user?.phone,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query))
        })
    }, [passengers, search])

    const handleToggleStatus = async (id, currentStatus) => {
        const action = currentStatus ? 'suspend' : 'activate';

        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} account?`,
            text: `Are you sure you want to ${action} this passenger's login access?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#fa5252' : '#0ca678',
            cancelButtonColor: '#adb5bd',
            confirmButtonText: `Yes, ${action} it!`
        });

        if (!result.isConfirmed) return;

        const newStatus = !currentStatus;
        try {
            await updatePassengerStatus(id, newStatus, token);
            setPassengers(passengers.map(p =>
                p.id === id ? { ...p, user: { ...p.user, is_active: newStatus } } : p
            ));
            Swal.fire({
                title: 'Status Updated',
                text: `Passenger account has been ${newStatus ? 'activated' : 'suspended'}.`,
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

    return (
        <section className="content-page">
            <div className="top-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px' }}>
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search name, email or phone..."
                />
            </div>

            <DataTable
                headers={['Customer', 'Contact', 'Balance', 'Status', 'Actions']}
                gridTemplate="1.5fr 2fr 1fr 1fr 1fr"
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                    perPage: pagination.perPage,
                    onPageChange: setPage,
                }}
            >
                {loading ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Loading customers...</span>
                    </div>
                ) : filteredPassengers.length === 0 ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No customers found.</span>
                    </div>
                ) : (
                    filteredPassengers.map((p) => (
                        <div className="table-row" key={p.id} style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr' }}>
                            <div className="cell-driver">
                                <div className="avatar-initials" style={{ background: '#f8f9fa', color: '#1a1f2b' }}>
                                    {p.user?.first_name?.charAt(0) || 'C'}
                                </div>
                                <div className="driver-info">
                                    <h4>{p.user?.first_name} {p.user?.last_name}</h4>
                                    <p>ID: #{p.id}</p>
                                </div>
                            </div>
                            <div className="cell-contact">
                                <p style={{ fontSize: '13px', marginBottom: 4 }}>{p.user?.email}</p>
                                <p style={{ fontSize: '12px', color: '#868e96' }}>{p.user?.phone}</p>
                            </div>
                            <div className="cell-contact">
                                <p style={{ fontWeight: 700, color: '#2b8a3e' }}>LKR {p.wallet_balance}</p>
                            </div>
                            <div className="cell-status">
                                <button
                                    className={`badge-status ${p.user?.is_active ? 'approved' : 'pending'}`}
                                    style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                                    onClick={() => handleToggleStatus(p.id, p.user?.is_active)}
                                >
                                    {p.user?.is_active ? 'Active' : 'Suspended'}
                                </button>
                            </div>
                            <div className="cell-actions">
                                <button
                                    type="button"
                                    className="btn-view"
                                >
                                    <span className="material-icons">visibility</span>
                                    Details
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </DataTable>
        </section>
    )
}

export default Passengers
