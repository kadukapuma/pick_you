import { createElement, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    FiActivity, FiCalendar, FiChevronRight, FiCreditCard, FiDollarSign,
    FiFileText, FiStar, FiTrendingUp, FiTruck, FiUsers,
} from 'react-icons/fi'
import { LuCarFront, LuCarTaxiFront, LuReceiptText } from 'react-icons/lu'
import { MdElectricRickshaw, MdTwoWheeler } from 'react-icons/md'
import { FaVanShuttle } from 'react-icons/fa6'
import { useAdmin } from '../../context/AdminContext'
import echo from '../../echo'
import {
    fetchReportsOverview, fetchVehicleSummary, fetchRideStatistics,
    fetchPaymentBreakdown, fetchVehicleTypes,
} from '../../services/adminApi'
import './Reports.css'

const periods = {
    day: { label: 'Today' },
    week: { label: 'This week' },
    month: { label: 'This month' },
}

const paymentColors = { cash: '#05a84d', wallet: '#6dd38d', card: '#2e80d1' }
const paymentColorFor = (method) => paymentColors[method] || '#aeb4ba'

const vehicleIconFor = (name = '') => {
    const n = name.toLowerCase()
    if (n.includes('tuk')) return MdElectricRickshaw
    if (n.includes('bike') || n.includes('motor')) return MdTwoWheeler
    if (n.includes('van')) return FaVanShuttle
    if (n.includes('car')) return LuCarFront
    return FiTruck
}

const formatMoney = (value) => `Rs. ${Math.round(Math.abs(Number(value) || 0)).toLocaleString('en-LK')}`

const formatDateRange = (since) => {
    if (!since) return 'All time'
    const start = new Date(since)
    const today = new Date()
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function LineChart({ values, labels }) {
    const max = Math.max(...values, 1)
    const coords = values.map((value, index) => [8 + index * (93 / Math.max(values.length - 1, 1)), 89 - (value / max) * 67])
    const smoothPath = coords.reduce((path, point, index) => {
        if (index === 0) return `M ${point[0]} ${point[1]}`
        const previous = coords[index - 1]
        const controlX = (previous[0] + point[0]) / 2
        return `${path} C ${controlX} ${previous[1]}, ${controlX} ${point[1]}, ${point[0]} ${point[1]}`
    }, '')
    const areaPath = coords.length ? `${smoothPath} L ${coords.at(-1)[0]} 92 L ${coords[0][0]} 92 Z` : ''
    const [active, setActive] = useState(null)

    if (!values.length) return <div className="report-line-chart"><p style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No revenue recorded for this period yet.</p></div>

    return (
        <div className="report-line-chart">
            <div className="chart-y-labels"><span>{formatMoney(max)}</span><span>{formatMoney(max * .75)}</span><span>{formatMoney(max * .5)}</span><span>{formatMoney(max * .25)}</span><span>0</span></div>
            <svg viewBox="0 0 108 100" preserveAspectRatio="none" aria-label="Revenue trend chart">
                <defs>
                    <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity=".3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity=".015" />
                    </linearGradient>
                    <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#059669" floodOpacity=".2" />
                    </filter>
                </defs>
                {[22, 36, 50, 64, 78, 92].map(y => <line key={y} x1="8" x2="101" y1={y} y2={y} className="grid-line" />)}
                {active !== null && <line x1={coords[active][0]} x2={coords[active][0]} y1="18" y2="92" className="chart-crosshair" />}
                <path d={areaPath} className="chart-area" />
                <path d={smoothPath} className="chart-line" filter="url(#lineGlow)" />
                {values.map((value, index) => (
                    <g key={index} className="chart-point" onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}>
                        <circle className="chart-point-ring" cx={coords[index][0]} cy={coords[index][1]} r={active === index ? 3.4 : 0} />
                        <circle className="chart-point-dot" cx={coords[index][0]} cy={coords[index][1]} r={active === index ? 2 : 1.35} />
                        <circle className="chart-hit-area" cx={coords[index][0]} cy={coords[index][1]} r="6" />
                    </g>
                ))}
            </svg>
            {active !== null && <div className="chart-tooltip" style={{ left: `${coords[active][0]}%`, top: `${12 + (1 - values[active] / max) * 60}%` }}><span>{labels[active]} revenue</span><b>{formatMoney(values[active])}</b></div>}
            <div className="chart-x-labels">{labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
        </div>
    )
}

function MiniTable({ title, columns, rows, renderRow, onViewAll, emptyText }) {
    const visibleRows = rows.slice(0, 5)
    return (
        <article className="report-panel report-table-panel">
            <div className="panel-title-row">
                <h3>{title}</h3>
                <button className="text-button" onClick={onViewAll}>View full report <FiChevronRight /></button>
            </div>
            <div className="report-table-scroll">
                {visibleRows.length ? (
                    <table className="report-table">
                        <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
                        <tbody>{visibleRows.map(renderRow)}</tbody>
                    </table>
                ) : <p style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>{emptyText || 'No data yet.'}</p>}
            </div>
        </article>
    )
}

const Reports = () => {
    const navigate = useNavigate()
    const { token } = useAdmin()
    const [period, setPeriod] = useState('week')
    const [overview, setOverview] = useState(null)
    const [vehicleSummary, setVehicleSummary] = useState(null)
    const [rideStats, setRideStats] = useState(null)
    const [paymentData, setPaymentData] = useState(null)
    const [vehicleTypes, setVehicleTypes] = useState([])
    const [summaryVehicleType, setSummaryVehicleType] = useState('')
    const [rideVehicleType, setRideVehicleType] = useState('')
    const [paymentStatus, setPaymentStatus] = useState('all')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const loadOverview = useCallback(async () => {
        if (!token) return
        try {
            setError('')
            const data = await fetchReportsOverview(token, period)
            setOverview(data)
        } catch (err) {
            setError(err.message || 'Failed to load reports.')
        } finally {
            setLoading(false)
        }
    }, [token, period])

    const loadVehicleSummary = useCallback(async () => {
        if (!token) return
        try {
            const data = await fetchVehicleSummary(token, { vehicleType: summaryVehicleType })
            setVehicleSummary(data)
        } catch {
            // Non-critical panel - the rest of the dashboard still works without it.
        }
    }, [token, summaryVehicleType])

    const loadRideStats = useCallback(async () => {
        if (!token) return
        try {
            const data = await fetchRideStatistics(token, { period, vehicleType: rideVehicleType })
            setRideStats(data)
        } catch {
            // Non-critical panel - the rest of the dashboard still works without it.
        }
    }, [token, period, rideVehicleType])

    const loadPaymentData = useCallback(async () => {
        if (!token) return
        try {
            const data = await fetchPaymentBreakdown(token, { period, status: paymentStatus })
            setPaymentData(data)
        } catch {
            // Non-critical panel - the rest of the dashboard still works without it.
        }
    }, [token, period, paymentStatus])

    useEffect(() => {
        if (!token) return
        fetchVehicleTypes(token).then(({ vehicleTypes: types }) => setVehicleTypes(types || [])).catch(() => {})
    }, [token])

    useEffect(() => {
        setLoading(true)
        loadOverview()
        const interval = setInterval(loadOverview, 30000)
        return () => clearInterval(interval)
    }, [loadOverview])

    useEffect(() => {
        loadVehicleSummary()
        const interval = setInterval(loadVehicleSummary, 30000)
        return () => clearInterval(interval)
    }, [loadVehicleSummary])

    useEffect(() => {
        loadRideStats()
        const interval = setInterval(loadRideStats, 30000)
        return () => clearInterval(interval)
    }, [loadRideStats])

    useEffect(() => {
        loadPaymentData()
        const interval = setInterval(loadPaymentData, 30000)
        return () => clearInterval(interval)
    }, [loadPaymentData])

    useEffect(() => {
        if (!token) return
        const channel = echo.channel('admin.dashboard')
        const handleUpdate = () => loadOverview()
        channel.listen('DashboardUpdated', handleUpdate)
        return () => {
            channel.stopListening('DashboardUpdated', handleUpdate)
            echo.leave('admin.dashboard')
        }
    }, [token, loadOverview])

    const stats = overview?.stats || { revenue: 0, commission: 0, driver_earnings: 0, rides: 0 }
    const trend = overview?.trend || []
    const topDrivers = overview?.top_drivers || []
    const recentTransactions = overview?.recent_transactions || []
    const paymentMethods = paymentData?.payment_methods || {}
    const paymentTotal = Object.values(paymentMethods).reduce((sum, count) => sum + count, 0)

    const statCards = [
        [FiDollarSign, 'Total Revenue', formatMoney(stats.revenue), 'All ride payments'],
        [LuReceiptText, 'PickU Commission', formatMoney(stats.commission), 'Platform commission'],
        [FiUsers, 'Driver Earnings', formatMoney(stats.driver_earnings), 'Paid out to drivers'],
        [LuCarTaxiFront, 'Completed Rides', (stats.rides ?? 0).toLocaleString(), 'In selected period'],
    ]

    let cursor = 0
    const donutStops = Object.entries(paymentMethods).map(([name, count]) => {
        const pct = paymentTotal ? (count / paymentTotal) * 100 : 0
        const start = cursor
        cursor += pct
        return `${paymentColorFor(name)} ${start}% ${cursor}%`
    })
    const donutBackground = donutStops.length ? `conic-gradient(${donutStops.join(', ')})` : 'conic-gradient(#e5e7eb 0 100%)'

    const selectedSummaryVehicle = vehicleTypes.find(vt => String(vt.id) === String(summaryVehicleType))
    const selectedSummaryVehicleLabel = selectedSummaryVehicle ? (selectedSummaryVehicle.display_name || selectedSummaryVehicle.name) : 'All Vehicles'

    const rideStatus = rideStats || { completed: 0, cancelled: 0, ongoing: 0, requested: 0 }
    const rideStatusTotal = rideStatus.completed + rideStatus.cancelled + rideStatus.ongoing + rideStatus.requested
    const rideStatusMax = Math.max(rideStatus.completed, rideStatus.cancelled, rideStatus.ongoing, rideStatus.requested, 1)
    const rideStatusBars = [
        ['Completed', rideStatus.completed],
        ['Cancelled', rideStatus.cancelled],
        ['Ongoing', rideStatus.ongoing],
        ['Requested', rideStatus.requested],
    ].map(([label, value]) => [label, value, Math.max(Math.round((value / rideStatusMax) * 88), value ? 6 : 0)])

    return (
        <section className="reports-page">
            <div className="reports-heading">
                <div>
                    <h1>Reports Dashboard</h1>
                    <p>Overview of your PickU operations and performance</p>
                </div>
                <div className="report-actions">
                    <div className="period-tabs" aria-label="Report period">
                        {Object.entries(periods).map(([key, item]) => (
                            <button key={key} className={period === key ? 'active' : ''} onClick={() => setPeriod(key)}>{item.label}</button>
                        ))}
                    </div>
                    <div className="date-display"><FiCalendar />{formatDateRange(overview?.since)}</div>
                </div>
            </div>

            <div className="export-row">
                <span className="report-period-note"><span className="live-dot" /> {loading ? 'Loading…' : `Showing ${periods[period].label.toLowerCase()} data`}</span>
                {error && <span className="data-status"><span /> {error}</span>}
            </div>

            <div className="report-stat-grid">
                {statCards.map(([Icon, label, value, note], index) => (
                    <article className="report-stat-card" key={label} style={{ animationDelay: `${index * 70}ms` }}>
                        <div className="stat-icon"><Icon /></div>
                        <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
                    </article>
                ))}
            </div>

            <div className="reports-chart-grid">
                <article className="report-panel revenue-panel">
                    <div className="panel-title-row revenue-panel-header">
                        <div><span className="chart-eyebrow">Financial performance</span><h3>Revenue Overview</h3><span className="legend"><i /> Revenue (LKR)</span></div>
                        <div className="chart-header-actions">
                            <div className="chart-total"><small>7-day total</small><strong>{formatMoney(trend.reduce((sum, day) => sum + Number(day.revenue), 0))}</strong></div>
                        </div>
                    </div>
                    <LineChart
                        values={trend.map(day => Number(day.revenue))}
                        labels={trend.map(day => new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }))}
                    />
                </article>
                <article className="report-panel">
                    <div className="panel-title-row">
                        <h3>Payment Methods</h3>
                        <select className="chart-select" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                            <option value="all">All payments</option>
                            <option value="success">Successful</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    {paymentTotal ? (
                        <div className="payment-chart">
                            <div className="donut" style={{ background: donutBackground }}><div><strong>{paymentTotal.toLocaleString()}</strong><span>Total</span></div></div>
                            <div className="payment-legend">
                                {Object.entries(paymentMethods).map(([name, count]) => (
                                    <p key={name}><i style={{ background: paymentColorFor(name) }} /><span style={{ textTransform: 'capitalize' }}>{name}</span><b>{Math.round((count / paymentTotal) * 100)}%</b></p>
                                ))}
                            </div>
                        </div>
                    ) : <p style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No payments recorded for this period yet.</p>}
                </article>
                <article className="report-panel">
                    <div className="panel-title-row">
                        <h3>Ride Statistics</h3>
                        <select className="chart-select" value={rideVehicleType} onChange={e => setRideVehicleType(e.target.value)}>
                            <option value="">All Vehicles</option>
                            {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.display_name || vt.name}</option>)}
                        </select>
                    </div>
                    {rideStatusTotal ? (
                        <div className="bar-chart">
                            {rideStatusBars.map(([label, value, height]) => (
                                <div className="bar-item" key={label} title={`${label}: ${value.toLocaleString()}`}><b>{value.toLocaleString()}</b><div style={{ height: `${height}%` }} /><span>{label}</span></div>
                            ))}
                        </div>
                    ) : <p style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No rides in this period yet.</p>}
                </article>
            </div>

            <div className="reports-table-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <MiniTable
                    title="Top Drivers" columns={['Driver', 'Trips', 'Earnings', 'Commission', 'Rating']} rows={topDrivers}
                    onViewAll={() => navigate('/admin-portal/reports/driver-earnings')}
                    emptyText="No completed rides in this period yet."
                    renderRow={(row, i) => (
                        <tr key={row.driver_id}>
                            <td><span className="driver-rank">{i + 1}</span>{row.name}</td>
                            <td>{row.rides}</td>
                            <td>{formatMoney(row.earnings)}</td>
                            <td>{formatMoney(row.commission)}</td>
                            <td>{row.rating ?? '—'} <span className="rating-star">★</span></td>
                        </tr>
                    )}
                />
                <MiniTable
                    title="Recent Transactions" columns={['Type', 'Description', 'Amount', 'Date']} rows={recentTransactions}
                    onViewAll={() => navigate('/admin-portal/reports/transactions')}
                    emptyText="No ledger activity yet."
                    renderRow={row => {
                        const outgoing = Number(row.amount) < 0
                        return (
                            <tr key={row.id}>
                                <td><span className={`transaction-tag ${outgoing ? 'out' : 'in'}`}>{row.type}</span></td>
                                <td>{row.description}</td>
                                <td className={outgoing ? 'money-out' : 'money-in'}>{outgoing ? '−' : '+'}{formatMoney(row.amount)}</td>
                                <td>{row.posted_at ? new Date(row.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                            </tr>
                        )
                    }}
                />
            </div>

            <section className="report-library">
                <div className="report-library-heading">
                    <div><span>Detailed reports</span><h2>Explore more reports</h2><p>Open a complete report to filter, search and export its data.</p></div>
                </div>
                <div className="report-library-grid">
                    {[
                        ['daily-financial', FiCalendar, 'Daily Financial Report', 'Day-by-day revenue, earnings, promotions and profit.', 'Daily finance'],
                        ['financial', FiFileText, 'Monthly Financial Report', 'Gross revenue, earnings, promotions and net profit.', 'Finance'],
                        ['driver-performance', FiActivity, 'Driver Performance Report', 'Ratings, trip activity and cancellations per driver.', 'Operations'],
                        ['driver-earnings', FiDollarSign, 'Driver Earnings Report', 'Income, commission and net earnings per driver.', 'Payouts'],
                        ['transactions', FiFileText, 'Transactions Report', 'Ledger activity: commission, payouts and settlements.', 'Finance activity'],
                    ].map(([path, Icon, title, description, tag]) => (
                        <button key={path} className="report-library-card" onClick={() => navigate(`/admin-portal/reports/${path}`)}>
                            <span className="library-icon"><Icon /></span>
                            <span className="library-card-copy"><small>{tag}</small><strong>{title}</strong><p>{description}</p></span>
                            <span className="library-arrow"><FiChevronRight /></span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="vehicle-summary-section">
                <div className="vehicle-summary-header">
                    <div><span className="library-icon vehicle-selected-icon" key={summaryVehicleType}>{createElement(selectedSummaryVehicle ? vehicleIconFor(selectedSummaryVehicleLabel) : FiTruck)}</span><div><h3>Vehicle Performance Summary</h3><p>Operational totals for {selectedSummaryVehicleLabel.toLowerCase()}</p></div></div>
                    <label><span>Vehicle type</span><select value={summaryVehicleType} onChange={e => setSummaryVehicleType(e.target.value)}>
                        <option value="">All Vehicles</option>
                        {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.display_name || vt.name}</option>)}
                    </select></label>
                </div>
                <div className="report-totals" key={summaryVehicleType}>
                    {[
                        [LuCarTaxiFront, 'Total Rides', (vehicleSummary?.total_rides ?? 0).toLocaleString()],
                        [FiUsers, 'Total Customers', (vehicleSummary?.total_customers ?? 0).toLocaleString()],
                        [FiTrendingUp, 'Active Drivers', (vehicleSummary?.active_drivers ?? 0).toLocaleString()],
                        [FiTruck, 'Total Vehicles', (vehicleSummary?.total_vehicles ?? 0).toLocaleString()],
                        [FiCreditCard, 'Pending Payouts', vehicleSummary ? formatMoney(vehicleSummary.pending_payouts) : '—'],
                        [FiStar, 'Loyalty Points Issued', vehicleSummary?.loyalty_points_issued ?? '—'],
                    ].map(([Icon, label, value], index) => (
                        <div key={label} style={{ animationDelay: `${index * 45}ms` }}><Icon /><p><small>{label}</small><strong>{value}</strong></p></div>
                    ))}
                </div>
                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>Loyalty points aren't tracked anywhere in the system yet — shown as N/A rather than fabricated. Pending payouts is a company-wide ledger balance and doesn't change with the vehicle-type filter.</p>
            </section>
        </section>
    )
}

export default Reports
