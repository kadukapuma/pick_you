import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { resolveAssetUrl, updateDriverActiveStatus } from '../services/adminApi'
import { useAdmin } from '../context/AdminContext'
import Swal from 'sweetalert2'

import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'

const Drivers = () => {
    const { token } = useAdmin()
    const { driversState } = useOutletContext()
    const { drivers, loading, error, setDrivers, pagination, page, setPage } = driversState
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const filteredDrivers = useMemo(() => {
        const query = search.trim().toLowerCase()

        return drivers.filter((driver) => {
            const matchesStatus =
                statusFilter === 'all' || driver.status === statusFilter
            if (!matchesStatus) return false
            if (!query) return true

            return [
                driver.name,
                driver.email,
                driver.phone,
                driver.license_number,
                driver?.vehicle?.plate_number,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query))
        })
    }, [drivers, search, statusFilter])

    const handleToggleActive = async (id, currentActive) => {
        const action = currentActive ? 'suspend' : 'activate';

        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} account?`,
            text: `Are you sure you want to ${action} this driver's login access?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentActive ? '#fa5252' : '#0ca678',
            cancelButtonColor: '#adb5bd',
            confirmButtonText: `Yes, ${action} it!`
        });

        if (!result.isConfirmed) return;

        const newActive = !currentActive;
        try {
            await updateDriverActiveStatus(id, newActive, token);
            // Update local state if setDrivers is available via context
            if (setDrivers) {
                setDrivers(drivers.map(d => d.id === id ? { ...d, user: { ...d.user, is_active: newActive } } : d));
            }
            Swal.fire({
                title: 'Status Updated',
                text: `Driver account has been ${newActive ? 'activated' : 'suspended'}.`,
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
            <div className="top-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
                <div className="stats-summary" style={{ margin: 0, flex: 1, flexWrap: 'nowrap', overflowX: 'auto' }}>
                    <div className="stat-pill">
                        Total Drivers: <strong>{pagination.total || drivers.length}</strong>
                    </div>
                    <div className="stat-pill">
                        Active: <strong>{drivers.filter(d => d.status === 'approved').length}</strong>
                    </div>
                    <div className="stat-pill">
                        Pending: <strong>{drivers.filter(d => d.status === 'pending').length}</strong>
                    </div>
                    <div className="stat-pill">
                        Suspended: <strong>{drivers.filter(d => d.status === 'suspended').length}</strong>
                    </div>
                </div>

                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search name, email, phone or plate..."
                />
            </div>

            <DataTable
                headers={['Driver', 'Contact', 'License', 'Profile Status', 'Account', 'Rating', 'Actions']}
                gridTemplate="1.5fr 1.5fr 1fr 1fr 1fr 0.8fr 1fr"
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                    perPage: pagination.perPage,
                    onPageChange: setPage,
                }}
            >
                {loading ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 0.8fr 1fr' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Loading drivers...</span>
                    </div>
                ) : error ? (
                    <div className="table-row" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 0.8fr 1fr' }}>
                        <span className="form-error" style={{ gridColumn: '1 / -1' }}>{error}</span>
                    </div>
                ) : (
                    filteredDrivers.map((driver) => (
                        <div className="table-row" key={driver.id} style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 0.8fr 1fr' }}>
                            <div className="cell-driver">
                                <div className="avatar-initials">
                                    {driver.profile_picture_path ? (
                                        <img src={resolveAssetUrl(driver.profile_picture_path)} alt={driver.name} />
                                    ) : (
                                        driver.name?.charAt(0) || 'D'
                                    )}
                                </div>
                                <div className="driver-info">
                                    <h4>{driver.name}</h4>
                                    <p>ID: #{driver.id}</p>
                                </div>
                            </div>

                            <div className="cell-contact">
                                <p style={{ fontSize: '13px' }}>{driver.email}</p>
                                <p className="phone" style={{ fontSize: '12px' }}>{driver.phone}</p>
                            </div>

                            <div className="cell-license">
                                {driver.license_number || 'N/A'}
                            </div>

                            <div className="cell-status">
                                <span className={`badge-status ${driver.status || 'pending'}`}>
                                    {driver.status || 'pending'}
                                </span>
                            </div>

                            <div className="cell-status">
                                <button
                                    className={`badge-status ${driver.user?.is_active ? 'approved' : 'pending'}`}
                                    style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                                    onClick={() => handleToggleActive(driver.id, driver.user?.is_active)}
                                >
                                    {driver.user?.is_active ? 'Active' : 'Suspended'}
                                </button>
                            </div>

                            <div className="cell-rating">
                                <span className="material-icons star">star</span>
                                {driver.rating || '0.0'}
                            </div>

                            <div className="cell-actions">
                                <button
                                    type="button"
                                    className="btn-view"
                                    onClick={() => navigate(`/drivers/${driver.id}`)}
                                >
                                    <span className="material-icons">visibility</span>
                                    View
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </DataTable>
        </section>
    )
}

export default Drivers
