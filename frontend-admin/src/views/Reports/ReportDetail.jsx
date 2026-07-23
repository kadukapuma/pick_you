import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    FiArrowLeft, FiCalendar, FiChevronLeft, FiChevronRight, FiDownload,
    FiFileText, FiFilter, FiGrid, FiSearch,
} from 'react-icons/fi'
import './Reports.css'

const driverNames = ['Kasun Perera', 'Amal Silva', 'Nimal Fernando', 'Ruwan Jayasinghe', 'Sanjeewa Bandara', 'Tharindu Madushan', 'Dinesh Kumara', 'Akila Sampath', 'Chamod Lakshan', 'Isuru Prabath', 'Gayan Peris', 'Lahiru Kumara']
const cityNames = ['Kandy', 'Colombo', 'Gampola', 'Peradeniya', 'Matale', 'Jaffna', 'Kurunegala', 'Negombo', 'Galle', 'Nuwara Eliya', 'Trincomalee', 'Batticaloa']

const money = value => `Rs. ${value.toLocaleString('en-LK')}`
const today = new Date()
today.setHours(0, 0, 0, 0)
const reportDate = offset => {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const inputDate = date => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}
const shortDate = date => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const numericMoney = value => {
    if (typeof value === 'number') return value
    const normalized = String(value).replace(/^[^\d-]*/, '').replaceAll(',', '')
    return Number.parseFloat(normalized) || 0
}
const compactMoney = value => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${Math.round(value / 1000)}K` : String(Math.round(value))

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
    const ceiling = Math.ceil(max / 50000) * 50000
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

const reportConfigs = {
    'daily-financial': {
        eyebrow: 'Daily finance',
        title: 'Daily Financial Report',
        description: 'A day-by-day breakdown of revenue, driver earnings, refunds, promotions and profit.',
        columns: ['Date', 'Gross Revenue', 'Company Earnings', 'Driver Earnings', 'Refunds', 'Promotions', 'Net Profit'],
        rows: Array.from({ length: 30 }, (_, i) => {
            const gross = 248000 - (i % 6) * 12750
            const company = Math.round(gross * .06)
            const drivers = gross - company
            const refunds = 2100 + (i % 4) * 430
            const promotions = 4200 + (i % 5) * 510
            return [reportDate(i), money(gross), money(company), money(drivers), money(refunds), money(promotions), money(company - refunds - promotions)]
        }),
    },
    financial: {
        eyebrow: 'Finance overview',
        title: 'Monthly Financial Report',
        description: 'A month-by-month view of revenue, earnings, refunds, promotions and net profit.',
        columns: ['Month', 'Gross Revenue', 'Company Earnings', 'Driver Earnings', 'Refunds', 'Promotions', 'Net Profit'],
        rows: Array.from({ length: 18 }, (_, i) => {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
            const month = date.toLocaleDateString('en-US', { month: 'long' })
            const gross = 5240000 - i * 286000
            const company = Math.round(gross * .06)
            const drivers = gross - company
            const refunds = 42000 - i * 2100
            const promotions = 88000 - i * 3500
            return [`${month} ${date.getFullYear()}`, money(gross), money(company), money(drivers), money(refunds), money(promotions), money(company - refunds - promotions)]
        }),
        metrics: ['Gross Revenue', 'Company Earnings', 'Driver Earnings', 'Net Profit'],
    },
    'driver-performance': {
        eyebrow: 'Driver operations',
        title: 'Driver Performance Report',
        description: 'Measure driver quality, trip completion, acceptance and response efficiency.',
        columns: ['Driver', 'Rating', 'Completed Trips', 'Cancelled Trips', 'Acceptance Rate', 'Avg. Response', 'Total Earnings'],
        rows: driverNames.map((name, i) => [name, `${(4.9 - i * .04).toFixed(1)} ★`, 245 - i * 9, 4 + (i % 5), `${Math.max(82, 98 - i * 1.1).toFixed(1)}%`, `${24 + i * 2}s`, money(190750 - i * 8350)]),
    },
    'driver-earnings': {
        eyebrow: 'Driver finance',
        title: 'Driver Earnings Report',
        description: 'One row per driver with income, commission, wallet and settlement details.',
        columns: ['Driver Name', 'Completed Rides', 'Ride Income', 'Commission', 'Net Earnings', 'Current Wallet', 'Pending Settlement'],
        rows: driverNames.map((name, i) => {
            const income = 190750 - i * 8350
            const commission = Math.round(income * .06)
            return [name, 245 - i * 9, money(income), money(commission), money(income - commission), money(12800 + i * 920), money(i % 3 === 0 ? 18500 + i * 700 : 0)]
        }),
    },
    revenue: {
        eyebrow: 'Core business report',
        title: 'Revenue Report',
        description: 'Track fares, company earnings, driver earnings and completed ride volume.',
        columns: ['Date', 'Completed Rides', 'Total Revenue', 'Company Earnings', 'Driver Earnings', 'Average Fare', 'Highest Fare', 'Lowest Fare'],
        rows: Array.from({ length: 30 }, (_, i) => {
            const rides = 412 - (i % 7) * 18
            const revenue = 248000 - (i % 6) * 12750
            const company = Math.round(revenue * .06)
            return [reportDate(i), rides, money(revenue), money(company), money(revenue - company), money(Math.round(revenue / rides)), money(4850 - i * 17), money(180 + (i % 4) * 20)]
        }),
        metrics: ['Total Revenue', 'Company Earnings', 'Driver Earnings', 'Average Fare', 'Highest Fare', 'Lowest Fare', 'Completed Rides'],
    },
    drivers: {
        eyebrow: 'Driver performance',
        title: 'Top Drivers Report',
        description: 'Compare ride activity, earnings, commission and payout performance.',
        columns: ['#', 'Driver', 'Trips', 'Gross earnings', 'Commission (6%)', 'Bonus', 'Net payout', 'Rating'],
        rows: driverNames.map((name, i) => {
            const gross = 190750 - i * 8350
            const commission = Math.round(gross * .06)
            const bonus = Math.max(800, 4200 - i * 230)
            return [i + 1, name, 245 - i * 9, money(gross), money(commission), money(bonus), money(gross - commission + bonus), `${(4.9 - i * .04).toFixed(1)} ★`]
        }),
    },
    cities: {
        eyebrow: 'Regional performance',
        title: 'Revenue by City',
        description: 'Understand demand, completion and revenue across PickU service areas.',
        columns: ['#', 'City', 'Total rides', 'Completed', 'Cancelled', 'Revenue', 'Avg. fare', 'Growth'],
        rows: cityNames.map((name, i) => {
            const rides = 842 - i * 47
            const completed = Math.round(rides * .92)
            const revenue = 420500 - i * 24700
            return [i + 1, name, rides, completed, rides - completed, money(revenue), money(Math.round(revenue / completed)), `+${Math.max(2.1, 18.6 - i * .9).toFixed(1)}%`]
        }),
    },
    transactions: {
        eyebrow: 'Finance activity',
        title: 'Transactions Report',
        description: 'Review commission, payouts, wallet payments, bonuses and refunds.',
        columns: ['Reference', 'Type', 'Description', 'Account', 'Amount', 'Status', 'Date'],
        rows: Array.from({ length: 22 }, (_, i) => {
            const types = ['Commission', 'Payout', 'Revenue', 'Wallet', 'Bonus', 'Refund']
            const type = types[i % types.length]
            const outgoing = ['Payout', 'Bonus', 'Refund'].includes(type)
            return [`TXN-${String(10482 - i).padStart(6, '0')}`, type, `${type} transaction`, outgoing ? driverNames[i % driverNames.length] : `Passenger ${i + 104}`, `${outgoing ? '−' : '+'}${money(12500 + i * 1375)}`, i % 7 === 0 ? 'Pending' : 'Completed', `Jul ${23 - (i % 12)}, 2026`]
        }),
    },
}

const ReportDetail = () => {
    const { reportType } = useParams()
    const navigate = useNavigate()
    const config = reportConfigs[reportType] || reportConfigs.drivers
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [page, setPage] = useState(1)
    const [exporting, setExporting] = useState('')
    const [dateRange, setDateRange] = useState('7days')
    const [showCustomDates, setShowCustomDates] = useState(false)
    const defaultCustomStart = new Date(today)
    defaultCustomStart.setDate(defaultCustomStart.getDate() - 6)
    const [customStart, setCustomStart] = useState(inputDate(defaultCustomStart))
    const [customEnd, setCustomEnd] = useState(inputDate(today))
    const [appliedCustom, setAppliedCustom] = useState({ start: inputDate(defaultCustomStart), end: inputDate(today) })
    const [dateError, setDateError] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
    const [selectedYear, setSelectedYear] = useState(today.getFullYear())
    const [comparePrevious, setComparePrevious] = useState(true)
    const perPage = 8

    const filtered = useMemo(() => {
        const customFrom = new Date(`${appliedCustom.start}T00:00:00`)
        const customTo = new Date(`${appliedCustom.end}T23:59:59`)
        let periodRows = reportType === 'revenue' || reportType === 'daily-financial'
            ? config.rows.filter((row, index) => {
                if (dateRange === 'today') return index === 0
                if (dateRange === 'yesterday') return index === 1
                if (dateRange === '7days') return index < 7
                if (dateRange === '30days') return index < 30
                const rowDate = new Date(row[0])
                return rowDate >= customFrom && rowDate <= customTo
            })
            : config.rows
        if (reportType === 'financial') {
            periodRows = config.rows.filter(row => {
                const rowDate = new Date(row[0])
                return rowDate.getFullYear() === selectedYear
            })
        }
        return periodRows.filter(row => {
        const matchesSearch = row.some(value => String(value).toLowerCase().includes(search.toLowerCase()))
        const matchesStatus = status === 'all' || row.some(value => String(value).toLowerCase() === status)
        return matchesSearch && matchesStatus
        })
    }, [config.rows, search, status, dateRange, reportType, appliedCustom, selectedYear])
    const pages = Math.max(1, Math.ceil(filtered.length / perPage))
    const rows = filtered.slice((page - 1) * perPage, page * perPage)
    const hasAnalytics = reportType === 'revenue' || reportType === 'financial' || reportType === 'daily-financial'
    const financialChartRows = useMemo(() => config.rows.filter(row => {
        if (reportType !== 'financial') return false
        const rowDate = new Date(row[0])
        return rowDate.getFullYear() === selectedYear && rowDate.getMonth() <= selectedMonth
    }), [config.rows, reportType, selectedMonth, selectedYear])
    const reportingPeriod = useMemo(() => {
        if (reportType === 'financial') {
            return new Date(selectedYear, selectedMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
        const start = new Date(today)
        if (dateRange === 'today') return shortDate(today)
        if (dateRange === 'yesterday') {
            start.setDate(start.getDate() - 1)
            return shortDate(start)
        }
        if (dateRange === '7days') start.setDate(start.getDate() - 6)
        if (dateRange === '30days') start.setDate(start.getDate() - 29)
        if (dateRange === 'custom') {
            return `${shortDate(new Date(`${appliedCustom.start}T00:00:00`))} – ${shortDate(new Date(`${appliedCustom.end}T00:00:00`))}`
        }
        return `${shortDate(start)} – ${shortDate(today)}`
    }, [dateRange, appliedCustom, reportType, selectedMonth, selectedYear])

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
        setDateRange('custom')
        setDateError('')
        setPage(1)
    }
    const analyticsMetrics = useMemo(() => {
        if (reportType === 'financial') {
            const row = config.rows.find(item => {
                const rowDate = new Date(item[0])
                return rowDate.getMonth() === selectedMonth && rowDate.getFullYear() === selectedYear
            }) || config.rows[0]
            const comparison = value => comparePrevious ? value : 'Current month'
            return [
                ['Gross Revenue', row[1], comparison('+14.8%')], ['Company Earnings', row[2], comparison('+6.1%')],
                ['Driver Earnings', row[3], comparison('+17.1%')], ['Refunds', row[4], comparison('-3.2%')],
                ['Promotions', row[5], comparison('+1.7%')], ['Net Profit', row[6], comparison('+11.5%')],
            ]
        }
        if (reportType === 'daily-financial') {
            const sumColumn = index => filtered.reduce((sum, row) => sum + numericMoney(row[index]), 0)
            const gross = sumColumn(1)
            const company = sumColumn(2)
            const drivers = sumColumn(3)
            const refunds = sumColumn(4)
            const promotions = sumColumn(5)
            const profit = sumColumn(6)
            return [
                ['Gross Revenue', money(gross), `${filtered.length} days`],
                ['Company Earnings', money(company), '6% commission'],
                ['Driver Earnings', money(drivers), '94% of revenue'],
                ['Refunds', money(refunds), gross ? `${((refunds / gross) * 100).toFixed(1)}%` : '0%'],
                ['Promotions', money(promotions), gross ? `${((promotions / gross) * 100).toFixed(1)}%` : '0%'],
                ['Net Profit', money(profit), company ? `${((profit / company) * 100).toFixed(1)}% margin` : '0%'],
            ]
        }
        const totalRevenue = filtered.reduce((sum, row) => sum + numericMoney(row[2]), 0)
        const company = filtered.reduce((sum, row) => sum + numericMoney(row[3]), 0)
        const driver = filtered.reduce((sum, row) => sum + numericMoney(row[4]), 0)
        const completed = filtered.reduce((sum, row) => sum + Number(row[1]), 0)
        const fares = filtered.map(row => numericMoney(row[5]))
        const highs = filtered.map(row => numericMoney(row[6]))
        const lows = filtered.map(row => numericMoney(row[7]))
        return [
            ['Total Revenue', money(totalRevenue), `${filtered.length} days`],
            ['Company Earnings', money(company), '6%'],
            ['Driver Earnings', money(driver), '94%'],
            ['Average Fare', money(fares.length ? fares.reduce((a, b) => a + b, 0) / fares.length : 0), 'Per ride'],
            ['Highest Fare', money(highs.length ? Math.max(...highs) : 0), 'Maximum'],
            ['Lowest Fare', money(lows.length ? Math.min(...lows) : 0), 'Minimum'],
            ['Completed Rides', completed.toLocaleString(), 'Selected period'],
        ]
    }, [reportType, filtered, config.rows, comparePrevious, selectedMonth, selectedYear])

    const updateSearch = value => {
        setSearch(value)
        setPage(1)
    }

    const fileName = `${reportType}-report-${reportingPeriod.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
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
        const csv = [config.columns, ...filtered]
            .map(row => row.map(escapeCell).join(','))
            .join('\r\n')
        downloadBlob(`\uFEFF${csv}`, 'text/csv;charset=utf-8', 'csv')
        setExporting('')
    }

    const exportExcel = async () => {
        setExporting('excel')
        try {
            const XLSX = await import('xlsx')
            const sheet = XLSX.utils.aoa_to_sheet([config.columns, ...filtered])
            sheet['!cols'] = config.columns.map((column, index) => ({
                wch: Math.max(column.length + 4, ...filtered.map(row => String(row[index]).length + 2)),
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
            const landscape = config.columns.length > 6
            const documentPdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
            documentPdf.setFillColor(5, 150, 105)
            documentPdf.rect(0, 0, documentPdf.internal.pageSize.getWidth(), 76, 'F')
            documentPdf.setTextColor(255, 255, 255)
            documentPdf.setFontSize(18)
            documentPdf.text(config.title, 34, 34)
            documentPdf.setFontSize(9)
            documentPdf.text(`PickU Reports & Analytics · ${reportingPeriod}`, 34, 53)
            autoTable(documentPdf, {
                startY: 94,
                head: [config.columns],
                body: filtered,
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
                <div><span>{config.eyebrow}</span><h1>{config.title}</h1><p>{config.description}</p></div>
                <div className="detail-date"><FiCalendar /><div><small>Reporting period</small><strong>{reportingPeriod}</strong></div></div>
            </div>

            {reportType === 'financial' ? (
                <div className="monthly-report-controls">
                    <label><span>Report month</span><select value={selectedMonth} onChange={event => { setSelectedMonth(Number(event.target.value)); setPage(1) }}>{Array.from({ length: 12 }, (_, month) => <option key={month} value={month} disabled={selectedYear === today.getFullYear() && month > today.getMonth()}>{new Date(2026, month, 1).toLocaleDateString('en-US', { month: 'long' })}</option>)}</select></label>
                    <label><span>Year</span><select value={selectedYear} onChange={event => { setSelectedYear(Number(event.target.value)); setPage(1) }}>{[today.getFullYear(), today.getFullYear() - 1].map(year => <option key={year}>{year}</option>)}</select></label>
                    <label className="compare-toggle"><input type="checkbox" checked={comparePrevious} onChange={event => setComparePrevious(event.target.checked)} /><i /><span>Compare previous month</span></label>
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
            ) : (
                <div className="detail-period-filter">
                    {[
                        ['today', 'Today'], ['yesterday', 'Yesterday'], ['7days', 'Last 7 Days'],
                        ['30days', 'Last 30 Days'], ['custom', 'Custom Date'],
                    ].map(([value, label]) => <button key={value} className={dateRange === value ? 'active' : ''} onClick={() => { setShowCustomDates(value === 'custom'); if (value !== 'custom') { setDateRange(value); setPage(1); setDateError('') } }}>{label}</button>)}
                    {showCustomDates && <div className="inline-custom-dates"><input aria-label="Custom start date" type="date" max={inputDate(today)} value={customStart} onChange={event => setCustomStart(event.target.value)} /><span>to</span><input aria-label="Custom end date" type="date" min={customStart} max={inputDate(today)} value={customEnd} onChange={event => setCustomEnd(event.target.value)} /><button onClick={applyCustomDates}>Apply</button>{dateError && <em>{dateError}</em>}</div>}
                </div>
            )}

            {hasAnalytics && (
                <div className="detail-analytics">
                    <div className="detail-metric-grid">
                        {analyticsMetrics.map(([label, value, trend]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{trend}</small></div>)}
                    </div>
                    <div className="detail-trend-card">
                        <DetailTrendChart rows={reportType === 'financial' ? financialChartRows : filtered} reportType={reportType} period={reportType === 'financial' ? `${selectedYear} year to date` : dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : reportingPeriod} />
                    </div>
                </div>
            )}

            <div className="full-table-card">
                <div className="report-export-bar">
                    <div><FiDownload /><span>Export {filtered.length} filtered records</span></div>
                    <div className="report-export-actions">
                        <button onClick={exportPdf} disabled={Boolean(exporting)}><FiFileText />{exporting === 'pdf' ? 'Generating…' : 'Export PDF'}</button>
                        <button onClick={exportExcel} disabled={Boolean(exporting)}><FiGrid />{exporting === 'excel' ? 'Generating…' : 'Export Excel'}</button>
                        <button onClick={exportCsv} disabled={Boolean(exporting)}><FiDownload />{exporting === 'csv' ? 'Generating…' : 'Export CSV'}</button>
                    </div>
                </div>
                <div className="full-table-toolbar">
                    <div className="table-search"><FiSearch /><input value={search} onChange={e => updateSearch(e.target.value)} placeholder="Search this report..." /></div>
                    <div className="table-filter"><FiFilter /><select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="all">All records</option>{reportType === 'transactions' && <><option value="completed">Completed</option><option value="pending">Pending</option></>}</select></div>
                </div>
                <div className="full-table-wrap">
                    <table className="full-report-table">
                        <thead><tr>{config.columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
                        <tbody>
                            {rows.length ? rows.map((row) => (
                                <tr key={row.join('-')}>
                                    {row.map((value, cellIndex) => {
                                        const isStatus = value === 'Completed' || value === 'Pending'
                                        const isGrowth = typeof value === 'string' && value.startsWith('+')
                                        return <td key={`${value}-${cellIndex}`}><span className={`${isStatus ? `table-status ${value.toLowerCase()}` : ''} ${isGrowth ? 'growth-value' : ''}`}>{cellIndex === 1 && reportType === 'drivers' && <span className="table-avatar">{String(value).split(' ').map(v => v[0]).join('')}</span>}{value}</span></td>
                                    })}
                                </tr>
                            )) : <tr><td className="empty-table" colSpan={config.columns.length}>No records match your filters.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="table-pagination">
                    <span>Showing {filtered.length ? (page - 1) * perPage + 1 : 0}–{Math.min(page * perPage, filtered.length)} of {filtered.length} records</span>
                    <div><button disabled={page === 1} onClick={() => setPage(page - 1)}><FiChevronLeft /></button><strong>{page} / {pages}</strong><button disabled={page === pages} onClick={() => setPage(page + 1)}><FiChevronRight /></button></div>
                </div>
            </div>
        </section>
    )
}

export default ReportDetail
