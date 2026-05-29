import { useCallback, useMemo, useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import echo from '../../echo'
import { fetchDashboardStats } from '../../services/adminApi'
import StatCard from '../../components/StatCard/StatCard'
import DataTable from '../../components/DataTable/DataTable'
import './Dashboard.css'

const Dashboard = () => {
    const { token } = useAdmin()
    const { driversState } = useOutletContext()
    const { drivers, loading, error, pagination, refresh } = driversState
    const navigate = useNavigate()

    const [statsData, setStatsData] = useState({
        health: { api: 'Loading...', database_latency: '...' },
        recent_activity: []
    })

    const loadStats = useCallback(async () => {
        if (!token) return

        try {
            const data = await fetchDashboardStats(token)
            setStatsData(data)
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err)
        }
    }, [token])

    useEffect(() => {
        loadStats()
        // Refresh every 30 seconds
        const interval = setInterval(loadStats, 30000)
        return () => clearInterval(interval)
    }, [loadStats])

    useEffect(() => {
        if (!token) return

        const channel = echo.channel('admin.notifications')
        const handleNotification = () => {
            loadStats()
            if (refresh) {
                refresh()
            }
        }

        channel.listen('AdminNotification', handleNotification)

        return () => {
            channel.stopListening('AdminNotification', handleNotification)
            echo.leave('admin.notifications')
        }
    }, [token, loadStats, refresh])

    useEffect(() => {
        if (!token) return

        const channel = echo.channel('admin.dashboard')
        const handleDashboardUpdate = (payload) => {
            // Only update API stats, don't refresh drivers list
            // Drivers are updated in real-time by WebSocket listener in useDrivers hook
            if (payload?.event === 'driver.account') {
                loadStats()
            }
        }

        channel.listen('DashboardUpdated', handleDashboardUpdate)

        return () => {
            channel.stopListening('DashboardUpdated', handleDashboardUpdate)
            echo.leave('admin.dashboard')
        }
    }, [token, loadStats])

    const stats = useMemo(() => {
        const total = pagination?.total || drivers.length
        let onlineCount = 0
        const byStatus = drivers.reduce((acc, driver) => {
            const s = driver.status || 'pending'
            acc[s] = (acc[s] || 0) + 1

            // Check if driver is online (availability = 1)
            const isOnline = driver.availability === 1 || driver.availability === '1' || driver.availability === true
            if (isOnline) {
                onlineCount++
            }
            return acc
        }, {})

        return {
            total,
            active: onlineCount,
            pending: byStatus.pending || 0,
            updated: byStatus.updated || 0,
            suspend: byStatus.suspended || 0,
        }
    }, [drivers])

    return (
        <section className="content-page">
            <div className="dashboard-grid">
                <StatCard
                    label="Total Drivers"
                    value={stats.total}
                    icon="people"
                    trend="Registered Users"
                />
                <StatCard
                    label="Online Drivers"
                    value={stats.active}
                    icon="sensors"
                    trend="Currently Online"
                    trendClass="up"
                />
                <StatCard
                    label="Pending Approval"
                    value={stats.pending}
                    icon="hourglass_empty"
                    trend="Awaiting Review"
                />
                <StatCard
                    label="Update Requests"
                    value={stats.updated}
                    icon="edit_note"
                    trend="Vehicle Changes"
                />
                <StatCard
                    label="Suspended"
                    value={stats.suspend}
                    icon="report_problem"
                    trend="Issues"
                    trendClass="down"
                />
            </div>

            <DataTable
                headers={['Recent Drivers', 'Email', 'Status', 'Action']}
                gridTemplate="2fr 1.5fr 1fr 1fr"
            >
                {loading ? (
                    <div className="table-row">
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Loading drivers...</span>
                    </div>
                ) : error ? (
                    <div className="table-row">
                        <span className="form-error" style={{ gridColumn: '1 / -1' }}>{error}</span>
                    </div>
                ) : (
                    drivers.slice(0, 5).map((driver) => (
                        <div className="table-row" key={driver.id} style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr' }}>
                            <div className="cell-driver">
                                <div className="avatar-initials">
                                    {driver.name?.charAt(0) || 'D'}
                                </div>
                                <div className="driver-info">
                                    <h4>{driver.name}</h4>
                                    <p>ID: #{driver.id}</p>
                                </div>
                            </div>
                            <div className="cell-contact">
                                <p>{driver.email}</p>
                            </div>
                            <div className="cell-status">
                                <span className={`badge-status ${driver.status || 'pending'}`}>
                                    {driver.status || 'pending'}
                                </span>
                            </div>
                            <div className="cell-actions">
                                <button
                                    type="button"
                                    className="btn-view"
                                    title="View driver details"
                                    aria-label="View driver details"
                                    onClick={() => navigate(`/drivers/${driver.id}`)}
                                >
                                    <span className="material-icons">visibility</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </DataTable>

            <div className="dashboard-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 32 }}>
                <div className="detail-card">
                    <div className="detail-section">
                        <h3>Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button className="btn-view" title="Review pending drivers" aria-label="Review pending drivers" onClick={() => navigate('/drivers')}>
                                <span className="material-icons">person_add</span>
                            </button>
                            <button className="btn-view" style={{ background: '#f8f9fa', color: '#1a1f2b' }} title="Manage vehicles" aria-label="Manage vehicles" onClick={() => navigate('/vehicles')}>
                                <span className="material-icons">directions_car</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="detail-card">
                    <div className="detail-section">
                        <h3>System Health</h3>
                        <div className="info-item" style={{ marginBottom: 16 }}>
                            <label>API Status</label>
                            <span style={{ color: statsData.health.api === 'Operational' ? '#0ca678' : '#fa5252', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span className="material-icons" style={{ fontSize: 16 }}>
                                    {statsData.health.api === 'Operational' ? 'check_circle' : 'error'}
                                </span>
                                {statsData.health.api}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Database Latency</label>
                            <span>{statsData.health.database_latency}</span>
                        </div>
                    </div>
                </div>

                <div className="detail-card">
                    <div className="detail-section" style={{ marginBottom: 0 }}>
                        <h3>Recent Activity</h3>
                        {statsData.recent_activity.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {statsData.recent_activity.map((activity, index) => (
                                    <div key={index} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                        <div style={{
                                            padding: 6,
                                            borderRadius: 8,
                                            background: activity.type === 'driver' ? '#fff9db' : '#e7f5ff',
                                            color: activity.type === 'driver' ? '#f08c00' : '#228be6'
                                        }}>
                                            <span className="material-icons" style={{ fontSize: 18 }}>
                                                {activity.type === 'driver' ? 'person' : 'directions_car'}
                                            </span>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 13, fontWeight: 600 }}>{activity.action}: {activity.name}</p>
                                            <p className="muted" style={{ fontSize: 12 }}>{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="muted" style={{ fontSize: 13 }}>
                                No recent activity found.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Dashboard

