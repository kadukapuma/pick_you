import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    FiActivity, FiArrowRight, FiBarChart2, FiCalendar, FiCheck, FiChevronRight, FiCreditCard, FiDollarSign,
    FiFileText, FiStar, FiTrendingUp, FiTruck, FiUsers,
} from 'react-icons/fi'
import { LuCarTaxiFront, LuReceiptText } from 'react-icons/lu'
import { LuCarFront } from 'react-icons/lu'
import { MdElectricRickshaw, MdTwoWheeler } from 'react-icons/md'
import { FaVanShuttle } from 'react-icons/fa6'
import './Reports.css'

const periods = {
    day: { label: 'Today', range: 'Jul 23, 2026', factor: 0.16, chart: [82, 96, 73, 118, 104, 132, 146] },
    week: { label: 'This week', range: 'Jul 17 – Jul 23, 2026', factor: 1, chart: [102, 114, 161, 139, 168, 211, 174] },
    month: { label: 'This month', range: 'Jul 1 – Jul 23, 2026', factor: 4.15, chart: [126, 149, 137, 185, 201, 194, 228] },
}

const drivers = [
    ['Kasun Perera', 245, 190750, 11445, 4200, 183505, 4.9],
    ['Amal Silva', 220, 176200, 10572, 3600, 169228, 4.8],
    ['Nimal Fernando', 198, 152600, 9156, 3100, 146544, 4.7],
    ['Ruwan Jayasinghe', 172, 128400, 7704, 2800, 123496, 4.6],
    ['Sanjeewa Bandara', 160, 112300, 6738, 2400, 107962, 4.6],
    ['Tharindu Madushan', 148, 101450, 6087, 2100, 97463, 4.5],
    ['Dinesh Kumara', 139, 95600, 5736, 1900, 91764, 4.5],
]

const cities = [
    ['Kandy', 420500, 842], ['Colombo', 315200, 598], ['Gampola', 185600, 362],
    ['Peradeniya', 142800, 276], ['Matale', 76400, 128], ['Jaffna', 68900, 116],
    ['Kurunegala', 54700, 94],
]

const transactions = [
    ['Commission', 'PickU commission', 2450, 'Jul 23, 2026', 'in'],
    ['Payout', 'Driver payout', 45000, 'Jul 23, 2026', 'out'],
    ['Revenue', 'Ride payment', 12500, 'Jul 23, 2026', 'in'],
    ['Bonus', 'Peak-hour bonus', 800, 'Jul 22, 2026', 'out'],
    ['Wallet', 'Customer top-up', 8750, 'Jul 22, 2026', 'in'],
    ['Refund', 'Cancelled ride refund', 1350, 'Jul 21, 2026', 'out'],
]

const formatMoney = (value) => `Rs. ${Math.round(value).toLocaleString('en-LK')}`

function LineChart({ values, labels }) {
    const max = Math.max(...values)
    const coords = values.map((value, index) => [8 + index * 15.3, 89 - (value / max) * 67])
    const smoothPath = coords.reduce((path, point, index) => {
        if (index === 0) return `M ${point[0]} ${point[1]}`
        const previous = coords[index - 1]
        const controlX = (previous[0] + point[0]) / 2
        return `${path} C ${controlX} ${previous[1]}, ${controlX} ${point[1]}, ${point[0]} ${point[1]}`
    }, '')
    const areaPath = `${smoothPath} L ${coords.at(-1)[0]} 92 L ${coords[0][0]} 92 Z`
    const [active, setActive] = useState(null)
    return (
        <div className="report-line-chart">
            <div className="chart-y-labels"><span>250K</span><span>200K</span><span>150K</span><span>100K</span><span>50K</span><span>0</span></div>
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
            {active !== null && <div className="chart-tooltip" style={{ left: `${8 + active * 15.3}%`, top: `${12 + (1 - values[active] / max) * 60}%` }}><span>{labels[active]} revenue</span><b>Rs. {values[active]},000</b><small>↑ 12.4% from last period</small></div>}
            <div className="chart-x-labels">{labels.map(day => <span key={day}>{day}</span>)}</div>
        </div>
    )
}

function MiniTable({ title, columns, rows, renderRow, onViewAll }) {
    const visibleRows = rows.slice(0, 5)
    return (
        <article className="report-panel report-table-panel">
            <div className="panel-title-row">
                <h3>{title}</h3>
                <button className="text-button" onClick={onViewAll}>View full report <FiChevronRight /></button>
            </div>
            <div className="report-table-scroll">
                <table className="report-table">
                    <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
                    <tbody>{visibleRows.map(renderRow)}</tbody>
                </table>
            </div>
        </article>
    )
}

const Reports = () => {
    const navigate = useNavigate()
    const [period, setPeriod] = useState('week')
    const [customStart, setCustomStart] = useState('2026-07-17')
    const [customEnd, setCustomEnd] = useState('2026-07-23')
    const [appliedDates, setAppliedDates] = useState({ start: '2026-07-17', end: '2026-07-23' })
    const [revenueMetric, setRevenueMetric] = useState('revenue')
    const [rideFilter, setRideFilter] = useState('all')
    const [paymentFilter, setPaymentFilter] = useState('all')

    const current = periods[period] || { ...periods.week, label: 'Custom range', range: `${appliedDates.start} – ${appliedDates.end}` }
    const multiplier = current.factor
    const stats = useMemo(() => ({
        revenue: 1240500 * multiplier,
        commission: 74430 * multiplier,
        earnings: 1166070 * multiplier,
        rides: Math.round(2483 * multiplier),
    }), [multiplier])
    const vehicleProfiles = {
        all: { label: 'All Vehicles', factor: 1, icon: FiTruck },
        car: { label: 'Car', factor: .38, icon: LuCarFront },
        tuk: { label: 'Tuk Tuk', factor: .27, icon: MdElectricRickshaw },
        bike: { label: 'Bike', factor: .18, icon: MdTwoWheeler },
        van: { label: 'Van', factor: .08, icon: FaVanShuttle },
        minivan: { label: 'Mini Van', factor: .05, icon: FaVanShuttle },
        minicar: { label: 'Mini Car', factor: .04, icon: LuCarFront },
    }
    const selectedVehicle = vehicleProfiles[rideFilter]
    const SelectedVehicleIcon = selectedVehicle.icon
    const rideFactor = selectedVehicle.factor
    const paymentData = {
        all: { total: 1.11, values: [['Cash', '45%', 'cash'], ['Wallet', '30%', 'wallet'], ['Card', '20%', 'card'], ['Other', '5%', 'other']] },
        success: { total: 1.02, values: [['Cash', '48%', 'cash'], ['Wallet', '29%', 'wallet'], ['Card', '21%', 'card'], ['Other', '2%', 'other']] },
        pending: { total: .09, values: [['Cash', '10%', 'cash'], ['Wallet', '42%', 'wallet'], ['Card', '38%', 'card'], ['Other', '10%', 'other']] },
    }[paymentFilter]

    const selectPeriod = (value) => {
        setPeriod(value)
    }

    const statCards = [
        [FiDollarSign, 'Total Revenue', formatMoney(stats.revenue), '18.6%', 'All ride payments'],
        [LuReceiptText, 'PickU Commission', formatMoney(stats.commission), '6%', 'of total revenue'],
        [FiUsers, 'Driver Earnings', formatMoney(stats.earnings), '22.4%', 'after commission'],
        [LuCarTaxiFront, 'Completed Rides', stats.rides.toLocaleString(), '15.3%', 'completion rate 90%'],
    ]

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
                            <button key={key} className={period === key ? 'active' : ''} onClick={() => selectPeriod(key)}>{item.label}</button>
                        ))}
                        <button className={period === 'custom' ? 'active' : ''} onClick={() => selectPeriod('custom')}>Custom</button>
                    </div>
                    <div className="date-display"><FiCalendar />{current.range}</div>
                </div>
            </div>

            {period === 'custom' && (
                <div className="custom-date-row">
                    <div className="custom-date-intro">
                        <span><FiCalendar /></span>
                        <div><strong>Choose a custom period</strong><small>Select the exact dates you want to analyse</small></div>
                    </div>
                    <div className="custom-date-fields">
                        <label><span>Start date</span><div><FiCalendar /><input type="date" value={customStart} max={customEnd} onChange={e => setCustomStart(e.target.value)} /></div></label>
                        <span className="custom-date-arrow"><FiArrowRight /></span>
                        <label><span>End date</span><div><FiCalendar /><input type="date" value={customEnd} min={customStart} onChange={e => setCustomEnd(e.target.value)} /></div></label>
                    </div>
                    <div className="custom-date-submit">
                        {customStart > customEnd && <small>Start date must be before end date</small>}
                        <button disabled={!customStart || !customEnd || customStart > customEnd} onClick={() => { setAppliedDates({ start: customStart, end: customEnd }); setPeriod('custom') }}><FiCheck /> Apply period</button>
                    </div>
                </div>
            )}

            <div className="export-row">
                <span className="report-period-note"><span className="live-dot" /> Showing {current.label.toLowerCase()} data</span>
                <span className="data-status"><span /> Demo data · updates with selected period</span>
            </div>

            <div className="report-stat-grid">
                {statCards.map(([Icon, label, value, trend, note], index) => (
                    <article className="report-stat-card" key={label} style={{ animationDelay: `${index * 70}ms` }}>
                        <div className="stat-icon"><Icon /></div>
                        <div><span>{label}</span><strong>{value}</strong><small><b>↑ {trend}</b> {note}</small></div>
                    </article>
                ))}
            </div>

            <div className="reports-chart-grid">
                <article className="report-panel revenue-panel">
                    <div className="panel-title-row revenue-panel-header">
                        <div><span className="chart-eyebrow">Financial performance</span><h3>Revenue Overview</h3><span className="legend"><i /> {revenueMetric === 'revenue' ? 'Revenue' : 'Commission'} (LKR)</span></div>
                        <div className="chart-header-actions">
                            <div className="chart-total"><small>7-day total</small><strong>{formatMoney((current.chart || periods.week.chart).reduce((sum, value) => sum + value, 0) * 1000 * (revenueMetric === 'commission' ? .06 : 1))}</strong></div>
                            <select className="chart-select" value={revenueMetric} onChange={e => setRevenueMetric(e.target.value)}><option value="revenue">Revenue</option><option value="commission">Commission</option></select>
                        </div>
                    </div>
                    <LineChart values={(current.chart || periods.week.chart).map(v => revenueMetric === 'commission' ? Math.round(v * .06) : v)} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
                </article>
                <article className="report-panel">
                    <div className="panel-title-row"><h3>Ride Statistics</h3><select className="chart-select" value={rideFilter} onChange={e => setRideFilter(e.target.value)}>{Object.entries(vehicleProfiles).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></div>
                    <div className="bar-chart">
                        {[['Completed', Math.round(stats.rides * rideFactor), 88], ['Cancelled', Math.round(stats.rides * .061 * rideFactor), 22], ['Pending', Math.round(stats.rides * .031 * rideFactor), 14], ['Ongoing', Math.round(stats.rides * .013 * rideFactor), 9]].map(([label, value, height]) => (
                            <div className="bar-item" key={`${rideFilter}-${label}`} title={`${label}: ${value.toLocaleString()}`}><b>{value.toLocaleString()}</b><div style={{ height: `${height}%` }} /><span>{label}</span></div>
                        ))}
                    </div>
                </article>
                <article className="report-panel">
                    <div className="panel-title-row"><h3>Payment Methods</h3><select className="chart-select" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}><option value="all">All payments</option><option value="success">Successful</option><option value="pending">Pending</option></select></div>
                    <div className="payment-chart">
                        <div className={`donut ${paymentFilter}`} key={paymentFilter}><div><strong>{Math.round(stats.rides * paymentData.total).toLocaleString()}</strong><span>Total</span></div></div>
                        <div className="payment-legend">
                            {paymentData.values.map(([name, value, cls]) => <p key={name}><i className={cls} /><span>{name}</span><b>{value}</b></p>)}
                        </div>
                    </div>
                </article>
            </div>

            <div className="reports-table-grid">
                <MiniTable title="Top Drivers" columns={['Driver', 'Trips', 'Earnings', 'Commission', 'Net payout', 'Rating']} rows={drivers} onViewAll={() => navigate('/admin-portal/reports/drivers')}
                    renderRow={(row, i) => <tr key={row[0]}><td><span className="driver-rank">{i + 1}</span>{row[0]}</td><td>{row[1]}</td><td>{formatMoney(row[2])}</td><td>{formatMoney(row[3])}</td><td>{formatMoney(row[5])}</td><td>{row[6]} <span className="rating-star">★</span></td></tr>} />
                <MiniTable title="Revenue by City" columns={['City', 'Revenue', 'Rides']} rows={cities} onViewAll={() => navigate('/admin-portal/reports/cities')}
                    renderRow={row => <tr key={row[0]}><td>{row[0]}</td><td>{formatMoney(row[1])}</td><td>{row[2]}</td></tr>} />
                <MiniTable title="Recent Transactions" columns={['Type', 'Description', 'Amount', 'Date']} rows={transactions} onViewAll={() => navigate('/admin-portal/reports/transactions')}
                    renderRow={row => <tr key={`${row[0]}-${row[3]}`}><td><span className={`transaction-tag ${row[4]}`}>{row[0]}</span></td><td>{row[1]}</td><td className={row[4] === 'out' ? 'money-out' : 'money-in'}>{row[4] === 'out' ? '−' : '+'}{formatMoney(row[2])}</td><td>{row[3]}</td></tr>} />
            </div>

            <section className="report-library">
                <div className="report-library-heading">
                    <div><span>Detailed reports</span><h2>Explore more reports</h2><p>Open a complete report to filter, search and export its data.</p></div>
                </div>
                <div className="report-library-grid">
                    {[
                        ['daily-financial', FiCalendar, 'Daily Financial Report', 'Day-by-day revenue, earnings, refunds, promotions and profit.', 'Daily finance'],
                        ['financial', FiFileText, 'Monthly Financial Report', 'Gross revenue, earnings, refunds, promotions and net profit.', 'Finance'],
                        ['driver-performance', FiActivity, 'Driver Performance Report', 'Ratings, trip activity, acceptance and response times.', 'Operations'],
                        ['driver-earnings', FiDollarSign, 'Driver Earnings Report', 'Income, commission, net earnings, wallets and settlements.', 'Payouts'],
                        ['revenue', FiBarChart2, 'Revenue Report', 'Fares, company earnings, driver earnings and completed rides.', 'Revenue'],
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
                    <div><span className="library-icon vehicle-selected-icon" key={rideFilter}><SelectedVehicleIcon /></span><div><h3>Vehicle Performance Summary</h3><p>Operational totals for {selectedVehicle.label.toLowerCase()}</p></div></div>
                    <label><span>Vehicle type</span><select value={rideFilter} onChange={event => setRideFilter(event.target.value)}>{Object.entries(vehicleProfiles).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
                </div>
                <div className="report-totals" key={rideFilter}>
                    {[[LuCarTaxiFront, 'Total Rides', Math.round(2765 * multiplier * rideFactor).toLocaleString()], [FiUsers, 'Total Customers', Math.round(1245 * multiplier * Math.max(rideFactor, .08)).toLocaleString()], [FiTrendingUp, 'Active Drivers', Math.round(286 * rideFactor).toLocaleString()], [SelectedVehicleIcon, 'Total Vehicles', Math.round(312 * rideFactor).toLocaleString()], [FiCreditCard, 'Pending Payouts', formatMoney(186200 * multiplier * rideFactor)], [FiStar, 'Loyalty Points Issued', Math.round(125000 * multiplier * rideFactor).toLocaleString()]].map(([Icon, label, value], index) => (
                        <div key={label} style={{ animationDelay: `${index * 45}ms` }}><Icon /><p><small>{label}</small><strong>{value}</strong></p></div>
                    ))}
                </div>
            </section>
        </section>
    )
}

export default Reports
