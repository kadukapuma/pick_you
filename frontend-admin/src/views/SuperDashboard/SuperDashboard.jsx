import { useCallback, useMemo, useState, useEffect } from 'react'
import { useAdmin } from '../../context/AdminContext'
import echo from '../../echo'
import { apiFetch, fetchSuperAdminNotifications } from '../../services/adminApi'
import StatCard from '../../components/StatCard/StatCard'
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton'
import '../Dashboard/Dashboard.css'

const SuperDashboard = () => {
    const { token, admin } = useAdmin()
    const [stats, setStats] = useState({
        admins_count: 0,
        drivers_count: 0,
        vehicles_count: 0,
        customers_count: 0,
        system_health: 'OK',
        latency: '...'
    })

    const loadStats = useCallback(async () => {
        if (!token) return

        try {
            // Fetch stats for super admin
            const [adminsRes, driversRes, vehiclesRes, passengersRes, healthRes] = await Promise.all([
                apiFetch('/admins', { token }),
                apiFetch('/drivers', { token }),
                apiFetch('/vehicles', { token }),
                apiFetch('/passengers', { token }),
                apiFetch('/dashboard/stats', { token })
            ])

            const adminsCount = adminsRes.data?.total || adminsRes.data?.data?.length || 0
            const driversCount = driversRes.data?.total || driversRes.data?.data?.length || 0
            const vehiclesCount = vehiclesRes.data?.total || vehiclesRes.data?.data?.length || 0
            const passengersCount = passengersRes.data?.total || passengersRes.data?.data?.length || 0

            setStats({
                admins_count: adminsCount,
                drivers_count: driversCount,
                vehicles_count: vehiclesCount,
                customers_count: passengersCount,
                system_health: healthRes.health?.api || 'OK',
                latency: healthRes.health?.database_latency || '...'
            })
        } catch (error) {
            console.error('Failed to fetch super stats:', error)
        }
    }, [token])

    useEffect(() => {
        loadStats()
        // Refresh every 30 seconds
        const interval = setInterval(loadStats, 30000)
        return () => clearInterval(interval)
    }, [loadStats])

    // Listen for super admin notifications via websockets
    useEffect(() => {
        if (!token) return

        const channel = echo.channel('superadmin.notifications')
        const handleNotification = () => {
            console.log('[SuperAdminNotification] Received - Refreshing stats')
            loadStats()
        }

        channel.listen('SuperAdminNotification', handleNotification)

        return () => {
            channel.stopListening('SuperAdminNotification')
            echo.leaveChannel('superadmin.notifications')
        }
    }, [token, loadStats])

    return (
        <section className="content-page">
            <div className="dashboard-grid">
                <StatCard
                    label="Total Admins"
                    value={stats.admins_count}
                    icon="admin_panel_settings"
                    trend="System Managers"
                />
                <StatCard
                    label="Total Drivers"
                    value={stats.drivers_count}
                    icon="people"
                    trend="Fleet Strength"
                />
                <StatCard
                    label="Total Vehicles"
                    value={stats.vehicles_count}
                    icon="directions_car"
                    trend="Active Fleet"
                />
                <StatCard
                    label="Total Customers"
                    value={stats.customers_count}
                    icon="person_outline"
                    trend="Customer Strength"
                />
                {/* <StatCard
                    label="API Status"
                    value={stats.system_health}
                    icon="sensors"
                    trend={stats.latency}
                    trendClass={stats.system_health === 'OK' ? 'up' : 'down'}
                /> */}
            </div>

            <div className="detail-card" style={{ marginTop: 32 }}>
                <div className="detail-section">
                    <h3>System Configuration</h3>
                    <div className="dashboard-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
                        <div className="info-item">
                            <label>Environment</label>
                            <span className="badge-status active">Production</span>
                        </div>
                        <div className="info-item">
                            <label>Super Admin</label>
                            <span>{admin?.first_name} {admin?.last_name}</span>
                        </div>
                        <div className="info-item">
                            <label>Last Backup</label>
                            <span>Today, 04:00 AM</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="detail-card" style={{ marginTop: 32 }}>
                <div className="detail-section">
                    <h3>Quick Management</h3>
                    <p className="muted" style={{ marginBottom: 20 }}>Direct access to critical administrative functions.</p>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <PrimaryButton icon="manage_accounts" onClick={() => window.location.href = '/admins'}>
                            Manage Admin Users
                        </PrimaryButton>
                        <button className="btn-view" style={{ background: '#f8f9fa', color: '#1a1f2b' }} title="Manage permissions" aria-label="Manage permissions" onClick={() => window.location.href = '/permissions'}>
                            <span className="material-icons">admin_panel_settings</span>
                        </button>
                        <button className="btn-view" style={{ background: '#f8f9fa', color: '#1a1f2b' }} title="System settings" aria-label="System settings">
                            <span className="material-icons">settings</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default SuperDashboard

