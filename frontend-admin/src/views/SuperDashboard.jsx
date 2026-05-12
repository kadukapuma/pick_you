import { useMemo, useState, useEffect } from 'react'
import { useAdmin } from '../context/AdminContext'
import { apiFetch } from '../services/adminApi'
import StatCard from '../components/StatCard'
import './Dashboard.css'

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

    useEffect(() => {
        const fetchSuperStats = async () => {
            try {
                // Fetch stats for super admin
                const [adminsRes, driversRes, vehiclesRes, passengersRes, healthRes] = await Promise.all([
                    apiFetch('/admins', { token }),
                    apiFetch('/drivers', { token }),
                    apiFetch('/vehicles', { token }),
                    apiFetch('/passengers', { token }),
                    apiFetch('/dashboard/stats', { token })
                ])

                setStats({
                    admins_count: adminsRes.data?.length || 0,
                    drivers_count: driversRes.data?.length || 0,
                    vehicles_count: vehiclesRes.data?.length || 0,
                    customers_count: passengersRes.data?.length || 0,
                    system_health: healthRes.health?.api || 'OK',
                    latency: healthRes.health?.database_latency || '...'
                })
            } catch (error) {
                console.error('Failed to fetch super stats:', error)
            }
        }
        fetchSuperStats()
    }, [token])

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
                        <button className="btn-signin" style={{ width: 'auto' }} onClick={() => window.location.href = '/admins'}>
                            <span className="material-icons" style={{ marginRight: 8 }}>manage_accounts</span>
                            Manage Admin Users
                        </button>
                        <button className="btn-view" style={{ width: 'auto', background: '#f8f9fa', color: '#1a1f2b' }}>
                            <span className="material-icons" style={{ marginRight: 8 }}>settings</span>
                            System Settings
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default SuperDashboard
