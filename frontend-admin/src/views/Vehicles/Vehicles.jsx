import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import DataTable from '../../components/DataTable/DataTable'
import SearchBar from '../../components/SearchBar/SearchBar'
import VehicleTypeIcon from '../../components/VehicleTypeIcon/VehicleTypeIcon'

const Vehicles = () => {
    const { vehiclesState } = useOutletContext()
    const { vehicles, loading, error, pagination, setPage } = vehiclesState
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const filteredVehicles = useMemo(() => {
        const query = search.trim().toLowerCase()

        return vehicles.filter((vehicle) => {
            const matchesStatus =
                statusFilter === 'all' || vehicle.status === statusFilter
            if (!matchesStatus) return false
            if (!query) return true

            return [
                vehicle.plate_number,
                vehicle.make,
                vehicle.model,
                vehicle.vehicle_type,
                vehicle?.driver?.name,
                vehicle?.driver?.email,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query))
        })
    }, [vehicles, search, statusFilter])

    return (
        <section className="content-page">
            <div className="top-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
                <div className="stats-summary" style={{ margin: 0, flex: 1, flexWrap: 'nowrap', overflowX: 'auto' }}>
                    <div className="stat-pill">
                        Total Vehicles: <strong>{pagination.total || vehicles.length}</strong>
                    </div>
                    <div className="stat-pill">
                        Active: <strong>{vehicles.filter(v => v.status === 'approved').length}</strong>
                    </div>
                    <div className="stat-pill">
                        Pending: <strong>{vehicles.filter(v => v.status === 'pending').length}</strong>
                    </div>
                    <div className="stat-pill">
                        Suspended: <strong>{vehicles.filter(v => v.status === 'suspended').length}</strong>
                    </div>
                </div>

                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search plate, model or driver..."
                />
            </div>

            <DataTable
                headers={['Vehicle / Plate', 'Driver', 'Details', 'Status', 'Year', 'Color', 'Action']}
                gridTemplate="2fr 1.5fr 1fr 1.2fr 0.8fr 0.8fr 120px"
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                    perPage: pagination.perPage,
                    onPageChange: setPage,
                }}
            >
                {loading ? (
                    <div className="table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr 0.8fr 0.8fr 120px' }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Loading vehicles...</span>
                    </div>
                ) : error ? (
                    <div className="table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr 0.8fr 0.8fr 120px' }}>
                        <span className="form-error" style={{ gridColumn: '1 / -1' }}>{error}</span>
                    </div>
                ) : (
                    filteredVehicles.map((vehicle) => (
                        <div className="table-row" key={vehicle.id} style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr 0.8fr 0.8fr 120px' }}>
                            <div className="cell-driver">
                                <VehicleTypeIcon
                                    type={vehicle.vehicle_type}
                                    size={20}
                                    style={{ width: 40, height: 40, justifyContent: 'center', padding: 0 }}
                                />
                                <div className="driver-info">
                                    <h4>{vehicle.plate_number}</h4>
                                    <p>{vehicle.vehicle_type || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="cell-contact">
                                <p>{vehicle?.driver?.name || 'Unknown'}</p>
                                <p className="phone">{vehicle?.driver?.email || ''}</p>
                            </div>

                            <div className="cell-license">
                                <p>{vehicle.make}</p>
                                <p className="muted" style={{ fontSize: 12 }}>{vehicle.model}</p>
                            </div>

                            <div className="cell-status">
                                <button className={`badge-status ${vehicle.status || 'pending'}`}>
                                    {vehicle.status || 'Error'}

                                </button>
                            </div>

                            <div className="cell-rating" style={{ fontWeight: 500 }}>
                                {vehicle.year || 'N/A'}
                            </div>

                            <div className="cell-trips">
                                {vehicle.color || 'N/A'}
                            </div>

                            <div className="cell-actions">
                                <button
                                    type="button"
                                    className="btn-view"
                                    title="View vehicle"
                                    aria-label="View vehicle"
                                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                                >
                                    <span className="material-icons">visibility</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </DataTable>
        </section>
    )
}

export default Vehicles

