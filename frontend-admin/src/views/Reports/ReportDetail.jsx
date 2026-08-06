import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    FiArrowLeft, FiCalendar, FiChevronLeft, FiChevronRight, FiDownload,
    FiFileText, FiFilter, FiGrid, FiSearch,
} from 'react-icons/fi'
import { useAdmin } from '../../context/AdminContext'
import {
    fetchRevenueDailyReport, fetchRevenueMonthlyReport,
    fetchDriverPerformanceReport, fetchDriverEarningsReport, fetchTransactionsReport,
} from '../../services/adminApi'
import './Reports.css'

const money = value => `Rs. ${Math.round(Number(value) || 0).toLocaleString('en-LK')}`
const today = new Date()
today.setHours(0, 0, 0, 0)
const inputDate = date => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}
const shortDate = date => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const formatMonth = m => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
const numericMoney = value => {
    if (typeof value === 'number') return value
    const normalized = String(value).replace(/^[^\d-]*/, '').replaceAll(',', '')
    return Number.parseFloat(normalized) || 0
}
const compactMoney = value => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${Math.round(value / 1000)}K` : String(Math.round(value))

const REPORT_META = {
    'daily-financial': {
        eyebrow: 'Daily finance',
        title: 'Daily Financial Report',
        description: 'A day-by-day breakdown of revenue, driver earnings, promotions and profit.',
        columns: ['Date', 'Gross Revenue', 'Company Earnings', 'Driver Earnings', 'Refunds', 'Promotions', 'Net Profit'],
    },
    financial: {
        eyebrow: 'Finance overview',
        title: 'Monthly Financial Report',
        description: 'A month-by-month view of revenue, earnings, promotions and net profit.',
        columns: ['Month', 'Gross Revenue', 'Company Earnings', 'Driver Earnings', 'Refunds', 'Promotions', 'Net Profit'],
    },
    'driver-performance': {
        eyebrow: 'Driver operations',
        title: 'Driver Performance Report',
        description: 'Measure driver quality and trip activity.',
        columns: ['Driver', 'Rating', 'Total Trips', 'Completed', 'Cancelled'],
    },
    'driver-earnings': {
        eyebrow: 'Driver finance',
        title: 'Driver Earnings Report',
        description: 'One row per driver with income, commission and net earnings.',
        columns: ['Driver Name', 'Completed Rides', 'Ride Income', 'Commission', 'Net Earnings'],
    },
    transactions: {
        eyebrow: 'Finance activity',
        title: 'Transactions Report',
        description: 'Review ledger activity: commission settlements, payouts, top-ups and adjustments.',
        columns: ['Reference', 'Type', 'Description', 'Gateway', 'Amount', 'Date'],
    },
}

const toRow = (reportType, raw) => {
    switch (reportType) {
        case 'daily-financial':
            return [raw.date, money(raw.gross_fares), money(raw.commission_revenue), money(raw.driver_earnings), raw.refunds, money(raw.promotions), money(raw.net_profit)]
        case 'financial':
            return [formatMonth(raw.month), money(raw.gross_fares), money(raw.commission_revenue), money(raw.driver_earnings), raw.refunds, money(raw.promotions), money(raw.net_profit)]
        case 'driver-performance':
            return [raw.name, raw.rating != null ? `${Number(raw.rating).toFixed(1)} ★` : '—', raw.rides, raw.completed_rides, raw.cancelled_rides]
        case 'driver-earnings':
            return [raw.name, raw.rides, money(raw.gross_fares), money(raw.commission), money(raw.earnings)]
        default:
            return [`TXN-${String(raw.id).padStart(6, '0')}`, raw.type, raw.description, raw.gateway || '—', `${Number(raw.amount) < 0 ? '−' : '+'}${money(raw.amount)}`, raw.posted_at ? shortDate(new Date(raw.posted_at)) : '—']
    }
}

const DetailTrendChart = ({ rows, reportType, period }) => {
    const [active, setActive] = useState(null)
    const isFinance = reportType === 'financial' || reportType === 'daily-financial'
    const source = (reportType === 'financial' ? rows : rows.slice(0, 12)).slice().reverse()
    const values = source.map(row => numericMoney(isFinance ? row[1] : row[2]))
    const labels = source.map(row => reportType === 'financial' ? String(row[0]).split(' ')[0] : new Date(row[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    const width = 640
    const height = 210
    const plot = { left: 58, right: 18, top: 18, bottom: 36 }
    const max = Math.max(...values, 1)
    const ceiling = Math.ceil(max / 50000) * 50000 || 50000
    const x = index => plot.left + (index * (width - plot.left - plot.right)) / Math.max(values.length - 1, 1)
    const y = value => plot.top + (1 - value / ceiling) * (height - plot.top - plot.bottom)
    const coords = values.map((value, index) => [x(index), y(value)])
    const linePath = coords.reduce((path, point, index) => {
        if (!index) return `M ${point[0]} ${point[1]}`
        const previous = coords[index - 1]
        const controlX = (previous[0] + point[0]) / 2
        return `${path} C ${controlX} ${previous[1]}, ${controlX} ${point[1]}, ${point[0]} ${point[1]}`
    }, '')
    const areaPath = coords.length ? `${linePath} L ${coords.at(-1)[0]} ${height - plot.bottom} L ${coords[0][0]} ${height - plot.bottom} Z` : ''
    const ticks = [1, .75, .5, .25, 0].map(ratio => Math.round(ceiling * ratio))

    if (!values.length) return <div className="detail-chart-empty">No chart data for this period.</div>

    return (
        <div className="real-detail-chart">
            <div className="detail-chart-summary"><div><span>Revenue Overview</span><small>Gross revenue performance</small></div><strong>{period}</strong></div>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Revenue trend for ${period}`}>
                <defs><linearGradient id="realDetailArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".3" /><stop offset="1" stopColor="#10b981" stopOpacity=".015" /></linearGradient></defs>
                {ticks.map((tick, index) => {
                    const tickY = plot.top + index * ((height - plot.top - plot.bottom) / 4)
                    return <g key={tick}><line x1={plot.left} x2={width - plot.right} y1={tickY} y2={tickY} /><text x={plot.left - 10} y={tickY + 3} textAnchor="end">Rs. {compactMoney(tick)}</text></g>
                })}
                {active !== null && <line className="detail-crosshair" x1={coords[active][0]} x2={coords[active][0]} y1={plot.top} y2={height - plot.bottom} />}
                <path className="detail-real-area" d={areaPath} />
                <path className="detail-real-line" d={linePath} />
                {coords.map((point, index) => <g key={`${labels[index]}-${values[index]}`} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} className="detail-real-point"><circle className="point-ring" cx={point[0]} cy={point[1]} r={active === index ? 8 : 0} /><circle className="point-dot" cx={point[0]} cy={point[1]} r={active === index ? 5 : 3.5} /><circle className="point-hit" cx={point[0]} cy={point[1]} r="14" /></g>)}
                {labels.map((label, index) => <text key={label} className="detail-x-label" x={x(index)} y={height - 12} textAnchor="middle">{label}</text>)}
            </svg>
            {active !== null && <div className="detail-chart-tooltip" style={{ left: `${(coords[active][0] / width) * 100}%`, top: `${(coords[active][1] / height) * 100}%` }}><span>{labels[active]}</span><strong>{money(values[active])}</strong><small>{isFinance ? 'Gross revenue' : 'Daily revenue'}</small></div>}
        </div>
    )
}

const ReportDetail = () => {
    const { reportType } = useParams()
    const navigate = useNavigate()
    const { token } = useAdmin()
    const meta = REPORT_META[reportType] || REPORT_META.transactions
    const isServerPaginated = reportType === 'driver-performance' || reportType === 'driver-earnings' || reportType === 'transactions'
    const hasAnalytics = reportType === 'daily-financial' || reportType === 'financial'
    const perPage = 8

    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [exporting, setExporting] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [rawRows, setRawRows] = useState([])
    const [serverMeta, setServerMeta] = useState(null)

    // daily-financial date range
    const defaultCustomStart = new Date(today)
    defaultCustomStart.setDate(defaultCustomStart.getDate() - 6)
    const [customStart, setCustomStart] = useState(inputDate(defaultCustomStart))
    const [customEnd, setCustomEnd] = useState(inputDate(today))
    const [appliedCustom, setAppliedCustom] = useState({ start: inputDate(defaultCustomStart), end: inputDate(today) })
    const [dateError, setDateError] = useState('')

    // financial month/year
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
    const [selectedYear, setSelectedYear] = useState(today.getFullYear())

    // driver reports period
    const [dbPeriod, setDbPeriod] = useState('month')

    // transactions filters
    const [txType, setTxType] = useState('')
    const [txStart, setTxStart] = useState('')
    const [txEnd, setTxEnd] = useState('')

    const load = useCallback(async () => {
        if (!token) return
        setLoading(true)
        setError('')
        try {
            if (reportType === 'daily-financial') {
                const data = await fetchRevenueDailyReport(token, { start: appliedCustom.start, end: appliedCustom.end })
                setRawRows((data.rows || []).slice().reverse())
                setServerMeta(null)
            } else if (reportType === 'financial') {
                const start = `${selectedYear}-01-01`
                const end = selectedYear === today.getFullYear() ? inputDate(today) : `${selectedYear}-12-31`
                const data = await fetchRevenueMonthlyReport(token, { start, end })
                setRawRows((data.rows || []).slice().reverse())
                setServerMeta(null)
            } else if (reportType === 'driver-performance') {
                const data = await fetchDriverPerformanceReport(token, { period: dbPeriod, search, page })
                setRawRows(data.data || [])
                setServerMeta({ currentPage: data.current_page || 1, lastPage: data.last_page || 1, total: data.total ?? (data.data || []).length })
            } else if (reportType === 'driver-earnings') {
                const data = await fetchDriverEarningsReport(token, { period: dbPeriod, search, page })
                setRawRows(data.data || [])
                setServerMeta({ currentPage: data.current_page || 1, lastPage: data.last_page || 1, total: data.total ?? (data.data || []).length })
            } else {
                const data = await fetchTransactionsReport(token, { type: txType, search, start: txStart, end: txEnd, page })
                setRawRows(data.data || [])
                setServerMeta({ currentPage: data.current_page || 1, lastPage: data.last_page || 1, total: data.total ?? (data.data || []).length })
            }
        } catch (err) {
            setError(err.message || 'Failed to load report.')
            setRawRows([])
            setServerMeta(null)
        } finally {
            setLoading(false)
        }
    }, [token, reportType, appliedCustom, selectedYear, dbPeriod, search, page, txType, txStart, txEnd])

    useEffect(() => { load() }, [load])
    useEffect(() => { setPage(1) }, [reportType, dbPeriod, txType, txStart, txEnd, appliedCustom, selectedYear])

    const displayRows = useMemo(() => rawRows.map(raw => toRow(reportType, raw)), [rawRows, reportType])

    const filtered = useMemo(() => {
        if (isServerPaginated) return displayRows
        if (!search) return displayRows
        return displayRows.filter(row => row.some(value => String(value).toLowerCase().includes(search.toLowerCase())))
    }, [displayRows, search, isServerPaginated])

    const pages = isServerPaginated ? (serverMeta?.lastPage || 1) : Math.max(1, Math.ceil(filtered.length / perPage))
    const pageSize = isServerPaginated ? (rawRows.length || 50) : perPage
    const totalRecords = isServerPaginated ? (serverMeta?.total ?? displayRows.length) : filtered.length
    const rows = isServerPaginated ? displayRows : filtered.slice((page - 1) * perPage, page * perPage)

    const financialChartRows = useMemo(() => {
        if (reportType !== 'financial') return []
        return rawRows
            .filter(r => {
                const [y, m] = String(r.month).split('-').map(Number)
                return y === selectedYear && (m - 1) <= selectedMonth
            })
            .map(raw => toRow(reportType, raw))
    }, [rawRows, reportType, selectedMonth, selectedYear])

    const reportingPeriod = useMemo(() => {
        if (reportType === 'financial') return new Date(selectedYear, selectedMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        if (reportType === 'daily-financial') return `${shortDate(new Date(`${appliedCustom.start}T00:00:00`))} – ${shortDate(new Date(`${appliedCustom.end}T00:00:00`))}`
        if (reportType === 'driver-performance' || reportType === 'driver-earnings') return { day: 'Today', week: 'This week', month: 'This month', all: 'All time' }[dbPeriod]
        if (txStart || txEnd) return `${txStart ? shortDate(new Date(`${txStart}T00:00:00`)) : '…'} – ${txEnd ? shortDate(new Date(`${txEnd}T00:00:00`)) : '…'}`
        return 'All time'
    }, [reportType, selectedMonth, selectedYear, appliedCustom, dbPeriod, txStart, txEnd])

    const analyticsMetrics = useMemo(() => {
        if (reportType === 'financial') {
            const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
            const row = rawRows.find(r => r.month === monthKey)
            if (!row) return []
            return [
                ['Gross Revenue', money(row.gross_fares), '—'],
                ['Company Earnings', money(row.commission_revenue), '—'],
                ['Driver Earnings', money(row.driver_earnings), '—'],
                ['Refunds', 'N/A', 'not tracked'],
                ['Promotions', money(row.promotions), '—'],
                ['Net Profit', money(row.net_profit), '—'],
            ]
        }
        if (reportType === 'daily-financial') {
            const sums = rawRows.reduce((acc, row) => ({
                gross: acc.gross + Number(row.gross_fares),
                company: acc.company + Number(row.commission_revenue),
                drivers: acc.drivers + Number(row.driver_earnings),
                promotions: acc.promotions + Number(row.promotions),
                netProfit: acc.netProfit + Number(row.net_profit),
            }), { gross: 0, company: 0, drivers: 0, promotions: 0, netProfit: 0 })
            return [
                ['Gross Revenue', money(sums.gross), `${rawRows.length} days`],
                ['Company Earnings', money(sums.company), '—'],
                ['Driver Earnings', money(sums.drivers), '—'],
                ['Refunds', 'N/A', 'not tracked'],
                ['Promotions', money(sums.promotions), '—'],
                ['Net Profit', money(sums.netProfit), '—'],
            ]
        }
        return []
    }, [reportType, rawRows, selectedMonth, selectedYear])

    const updateSearch = value => {
        setSearch(value)
        setPage(1)
    }

    const applyCustomDates = () => {
        if (!customStart || !customEnd) {
            setDateError('Select both dates.')
            return
        }
        if (customStart > customEnd) {
            setDateError('Start date must be before the end date.')
            return
        }
        if (new Date(`${customEnd}T00:00:00`) > today) {
            setDateError('End date cannot be in the future.')
            return
        }
        setAppliedCustom({ start: customStart, end: customEnd })
        setDateError('')
    }

    const applyTxDates = () => {
        if (txStart && txEnd && txStart > txEnd) {
            setDateError('Start date must be before the end date.')
            return
        }
        setDateError('')
        setTxStart(customStart)
        setTxEnd(customEnd)
    }

    const fileName = `${reportType}-report-${reportingPeriod.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
    const exportRows = isServerPaginated ? displayRows : filtered
    const downloadBlob = (content, type, extension) => {
        const url = URL.createObjectURL(new Blob([content], { type }))
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName}.${extension}`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
    }

    const exportCsv = () => {
        setExporting('csv')
        const escapeCell = value => `"${String(value).replaceAll('"', '""')}"`
        const csv = [meta.columns, ...exportRows]
            .map(row => row.map(escapeCell).join(','))
            .join('\r\n')
        downloadBlob(String.fromCharCode(0xFEFF) + csv, 'text/csv;charset=utf-8', 'csv')
        setExporting('')
    }

    const exportExcel = async () => {
        setExporting('excel')
        try {
            const XLSX = await import('xlsx')
            const sheet = XLSX.utils.aoa_to_sheet([meta.columns, ...exportRows])
            sheet['!cols'] = meta.columns.map((column, index) => ({
                wch: Math.max(column.length + 4, ...exportRows.map(row => String(row[index]).length + 2)),
            }))
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, sheet, 'Report')
            XLSX.writeFile(workbook, `${fileName}.xlsx`)
        } finally {
            setExporting('')
        }
    }

    const exportPdf = async () => {
        setExporting('pdf')
        try {
            const [{ jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ])
            const landscape = meta.columns.length > 6
            const documentPdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
            documentPdf.setFillColor(5, 150, 105)
            documentPdf.rect(0, 0, documentPdf.internal.pageSize.getWidth(), 76, 'F')
            documentPdf.setTextColor(255, 255, 255)
            documentPdf.setFontSize(18)
            documentPdf.text(meta.title, 34, 34)
            documentPdf.setFontSize(9)
            documentPdf.text(`PickU Reports & Analytics · ${reportingPeriod}`, 34, 53)
            autoTable(documentPdf, {
                startY: 94,
                head: [meta.columns],
                body: exportRows,
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 5, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: .5 },
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [247, 250, 249] },
                margin: { left: 28, right: 28 },
            })
            documentPdf.save(`${fileName}.pdf`)
        } finally {
            setExporting('')
        }
    }

    return (
        <section className="report-detail-page">
            <button className="back-button" onClick={() => navigate('/admin-portal/reports')}><FiArrowLeft /> Back to reports</button>
            <div className="detail-report-heading">
                <div><span>{meta.eyebrow}</span><h1>{meta.title}</h1><p>{meta.description}</p></div>
                <div className="detail-date"><FiCalendar /><div><small>Reporting period</small><strong>{reportingPeriod}</strong></div></div>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

            {reportType === 'financial' ? (
                <div className="monthly-report-controls">
                    <label><span>Report month</span><select value={selectedMonth} onChange={event => setSelectedMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, month) => <option key={month} value={month} disabled={selectedYear === today.getFullYear() && month > today.getMonth()}>{new Date(2026, month, 1).toLocaleDateString('en-US', { month: 'long' })}</option>)}</select></label>
                    <label><span>Year</span><select value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>{[today.getFullYear(), today.getFullYear() - 1].map(year => <option key={year}>{year}</option>)}</select></label>
                </div>
            ) : reportType === 'daily-financial' ? (
                <div className="daily-date-controls">
                    <div className="daily-date-label"><FiCalendar /><div><strong>Select report dates</strong><span>Choose the exact daily period to analyse</span></div></div>
                    <label><span>From</span><input type="date" max={customEnd || inputDate(today)} value={customStart} onChange={event => setCustomStart(event.target.value)} /></label>
                    <span className="date-range-arrow">→</span>
                    <label><span>To</span><input type="date" min={customStart} max={inputDate(today)} value={customEnd} onChange={event => setCustomEnd(event.target.value)} /></label>
                    <button onClick={applyCustomDates}>Apply filter</button>
                    {dateError && <em>{dateError}</em>}
                </div>
            ) : reportType === 'driver-performance' || reportType === 'driver-earnings' ? (
                <div className="detail-period-filter">
                    {[['day', 'Today'], ['week', 'This week'], ['month', 'This month'], ['all', 'All time']].map(([value, label]) => (
                        <button key={value} className={dbPeriod === value ? 'active' : ''} onClick={() => setDbPeriod(value)}>{label}</button>
                    ))}
                </div>
            ) : (
                <div className="daily-date-controls">
                    <div className="daily-date-label"><FiCalendar /><div><strong>Filter by date</strong><span>Leave blank to show all ledger activity</span></div></div>
                    <label><span>From</span><input type="date" max={customEnd || inputDate(today)} value={customStart} onChange={event => setCustomStart(event.target.value)} /></label>
                    <span className="date-range-arrow">→</span>
                    <label><span>To</span><input type="date" min={customStart} max={inputDate(today)} value={customEnd} onChange={event => setCustomEnd(event.target.value)} /></label>
                    <button onClick={applyTxDates}>Apply filter</button>
                    {dateError && <em>{dateError}</em>}
                </div>
            )}

            {hasAnalytics && (
                <div className="detail-analytics">
                    <div className="detail-metric-grid">
                        {analyticsMetrics.map(([label, value, trend]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{trend}</small></div>)}
                    </div>
                    <div className="detail-trend-card">
                        <DetailTrendChart rows={reportType === 'financial' ? financialChartRows : filtered} reportType={reportType} period={reportType === 'financial' ? `${selectedYear} year to date` : reportingPeriod} />
                    </div>
                </div>
            )}

            <div className="full-table-card">
                <div className="report-export-bar">
                    <div><FiDownload /><span>Export {exportRows.length} {isServerPaginated ? 'records (current page)' : 'filtered records'}</span></div>
                    <div className="report-export-actions">
                        <button onClick={exportPdf} disabled={Boolean(exporting)}><FiFileText />{exporting === 'pdf' ? 'Generating…' : 'Export PDF'}</button>
                        <button onClick={exportExcel} disabled={Boolean(exporting)}><FiGrid />{exporting === 'excel' ? 'Generating…' : 'Export Excel'}</button>
                        <button onClick={exportCsv} disabled={Boolean(exporting)}><FiDownload />{exporting === 'csv' ? 'Generating…' : 'Export CSV'}</button>
                    </div>
                </div>
                <div className="full-table-toolbar">
                    <div className="table-search"><FiSearch /><input value={search} onChange={e => updateSearch(e.target.value)} placeholder="Search this report..." /></div>
                    {reportType === 'transactions' && (
                        <div className="table-filter"><FiFilter /><select value={txType} onChange={e => setTxType(e.target.value)}>
                            <option value="">All types</option>
                            <option value="RIDE_SETTLEMENT">Ride settlement</option>
                            <option value="PAYOUT_REQUEST">Payout requested</option>
                            <option value="PAYOUT_PAID">Payout paid</option>
                            <option value="TOPUP">Top-up</option>
                            <option value="ADJUSTMENT">Adjustment</option>
                            <option value="REVERSAL">Reversal</option>
                        </select></div>
                    )}
                </div>
                <div className="full-table-wrap">
                    <table className="full-report-table">
                        <thead><tr>{meta.columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
                        <tbody>
                            {loading ? (
                                <tr><td className="empty-table" colSpan={meta.columns.length}>Loading…</td></tr>
                            ) : rows.length ? rows.map((row, rowIndex) => (
                                <tr key={`${row[0]}-${rowIndex}`}>
                                    {row.map((value, cellIndex) => (
                                        <td key={`${value}-${cellIndex}`}><span style={value === 'N/A' ? { color: 'var(--text-muted)', fontStyle: 'italic' } : undefined}>{value}</span></td>
                                    ))}
                                </tr>
                            )) : <tr><td className="empty-table" colSpan={meta.columns.length}>No records match your filters.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="table-pagination">
                    <span>Showing {totalRecords ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalRecords)} of {totalRecords} records</span>
                    <div><button disabled={page === 1} onClick={() => setPage(page - 1)}><FiChevronLeft /></button><strong>{page} / {pages}</strong><button disabled={page === pages} onClick={() => setPage(page + 1)}><FiChevronRight /></button></div>
                </div>
            </div>
        </section>
    )
}

export default ReportDetail
