import { useCallback, useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../../context/AdminContext'
import DataTable from '../../components/DataTable/DataTable'
import SearchBar from '../../components/SearchBar/SearchBar'
import Modal from '../../components/Modal/Modal'
import {
    fetchDriverAccounts,
    fetchDriverStatement,
    fetchFinanceSummary,
    fetchTrialBalance,
} from '../../services/adminApi'
import './Finance.css'

const GRID = '1.4fr 1fr 1fr 1fr 0.9fr 0.8fr'

const PERIODS = [
    { id: 'day', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
]

const FILTERS = [
    { id: 'all', label: 'All drivers' },
    { id: 'owing', label: 'Owe PickU' },
    { id: 'owed', label: 'Awaiting payout' },
    { id: 'blocked', label: 'Blocked' },
]

const formatMoney = (value) => {
    const amount = Number(value)
    if (Number.isNaN(amount)) return 'Rs. 0.00'

    return `Rs. ${Math.abs(amount).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

const Finance = () => {
    const { token } = useAdmin()

    const [period, setPeriod] = useState('month')
    const [summary, setSummary] = useState(null)
    const [summaryLoading, setSummaryLoading] = useState(true)

    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [accounts, setAccounts] = useState([])
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, perPage: 50 })
    const [accountsLoading, setAccountsLoading] = useState(true)

    const [statement, setStatement] = useState(null)
    const [statementLoading, setStatementLoading] = useState(false)

    const [trialBalance, setTrialBalance] = useState(null)
    const [trialOpen, setTrialOpen] = useState(false)

    const loadSummary = useCallback(async () => {
        if (!token) return

        try {
            setSummaryLoading(true)
            setSummary(await fetchFinanceSummary(token, period))
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to load finance summary', 'error')
        } finally {
            setSummaryLoading(false)
        }
    }, [token, period])

    const loadAccounts = useCallback(async (page = 1) => {
        if (!token) return

        try {
            setAccountsLoading(true)
            const response = await fetchDriverAccounts(token, { filter, search, page })

            setAccounts(response.data || [])
            setPagination({
                page: response.current_page ?? 1,
                totalPages: response.last_page ?? 1,
                total: response.total ?? 0,
                perPage: response.per_page ?? 50,
            })
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to load driver accounts', 'error')
        } finally {
            setAccountsLoading(false)
        }
    }, [token, filter, search])

    useEffect(() => {
        const timer = setTimeout(loadSummary, 0)
        return () => clearTimeout(timer)
    }, [loadSummary])

    // Debounced so typing in the search box doesn't fire a request per keystroke.
    useEffect(() => {
        const timer = setTimeout(() => loadAccounts(1), search ? 350 : 0)
        return () => clearTimeout(timer)
    }, [loadAccounts, search])

    const openStatement = async (driverId) => {
        try {
            setStatementLoading(true)
            setStatement({ loading: true })
            setStatement(await fetchDriverStatement(token, driverId))
        } catch (error) {
            setStatement(null)
            Swal.fire('Error', error.message || 'Failed to load driver statement', 'error')
        } finally {
            setStatementLoading(false)
        }
    }

    const openTrialBalance = async () => {
        try {
            setTrialOpen(true)
            setTrialBalance(await fetchTrialBalance(token))
        } catch (error) {
            setTrialOpen(false)
            Swal.fire('Error', error.message || 'Failed to load trial balance', 'error')
        }
    }

    const stat = (label, value, hint, tone) => (
        <div className={`finance-stat finance-stat--${tone || 'neutral'}`}>
            <span className="finance-stat-label">{label}</span>
            <strong className="finance-stat-value">{value}</strong>
            {hint && <span className="finance-stat-hint">{hint}</span>}
        </div>
    )

    return (
        <div className="finance-page">
            <div className="finance-header">
                <div>
                    <h1 className="finance-title">Finance</h1>
                    <p className="finance-subtitle">
                        Commission revenue and driver settlement positions
                    </p>
                </div>

                <div className="finance-actions">
                    <div className="finance-period-tabs">
                        {PERIODS.map((item) => (
                            <button
                                key={item.id}
                                className={`finance-tab ${period === item.id ? 'is-active' : ''}`}
                                onClick={() => setPeriod(item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <button className="finance-ghost-button" onClick={openTrialBalance}>
                        <span className="material-icons">balance</span>
                        Trial balance
                    </button>
                </div>
            </div>

            <div className="finance-stats">
                {summaryLoading || !summary ? (
                    <div className="finance-stats-loading">Loading summary...</div>
                ) : (
                    <>
                        {stat(
                            'Commission revenue',
                            formatMoney(summary.commission_revenue),
                            `${summary.ride_count} rides`,
                            'positive',
                        )}
                        {stat('Gross fares', formatMoney(summary.gross_fares), 'Total charged to passengers')}
                        {stat('Driver earnings', formatMoney(summary.driver_earnings), 'After commission')}
                        {stat(
                            'Owed to drivers',
                            formatMoney(summary.owed_to_drivers),
                            'Payouts pending',
                            'warning',
                        )}
                        {stat(
                            'Owed by drivers',
                            formatMoney(summary.owed_by_drivers),
                            'Cash commission outstanding',
                            'negative',
                        )}
                        {stat(
                            'Payment split',
                            `${summary.cash_rides} cash / ${summary.card_rides} card`,
                            'Completed rides this period',
                        )}
                    </>
                )}
            </div>

            <div className="finance-toolbar">
                <div className="finance-filters">
                    {FILTERS.map((item) => (
                        <button
                            key={item.id}
                            className={`finance-chip ${filter === item.id ? 'is-active' : ''}`}
                            onClick={() => setFilter(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <SearchBar
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search driver by name or phone"
                />
            </div>

            <DataTable
                headers={['Driver', 'Balance', 'Position', 'Credit limit', 'Rate', '']}
                gridTemplate={GRID}
                pagination={{ ...pagination, onPageChange: loadAccounts }}
            >
                {accountsLoading ? (
                    <div className="table-row" style={{ gridTemplateColumns: GRID }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                            Loading driver accounts...
                        </span>
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="table-row" style={{ gridTemplateColumns: GRID }}>
                        <span className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                            No driver accounts found.
                        </span>
                    </div>
                ) : (
                    accounts.map((row) => (
                        <div className="table-row" key={row.driver_id} style={{ gridTemplateColumns: GRID }}>
                            <div className="finance-driver">
                                <strong>{row.name || 'Unnamed driver'}</strong>
                                <span className="muted">{row.phone}</span>
                            </div>

                            <span className={`finance-amount finance-amount--${row.status.toLowerCase()}`}>
                                {row.status === 'OWING' ? '-' : ''}{formatMoney(row.balance)}
                            </span>

                            <div className="finance-position">
                                <span className={`finance-badge finance-badge--${row.status.toLowerCase()}`}>
                                    {row.status === 'OWING'
                                        ? 'Owes PickU'
                                        : row.status === 'OWED'
                                            ? 'Payout due'
                                            : 'Settled'}
                                </span>
                                {row.is_blocked && <span className="finance-badge finance-badge--blocked">Blocked</span>}
                                {!row.is_blocked && row.over_credit_limit && (
                                    <span className="finance-badge finance-badge--blocked">Over limit</span>
                                )}
                            </div>

                            <span>{formatMoney(row.credit_limit)}</span>

                            <span>
                                {row.commission_rate
                                    ? `${(Number(row.commission_rate) * 100).toFixed(2)}%`
                                    : <span className="muted">default</span>}
                            </span>

                            <button
                                className="finance-link-button"
                                onClick={() => openStatement(row.driver_id)}
                            >
                                Statement
                            </button>
                        </div>
                    ))
                )}
            </DataTable>

            <Modal
                isOpen={Boolean(statement)}
                onClose={() => setStatement(null)}
                title={statement?.driver?.name || 'Driver statement'}
                subtitle={statement?.driver?.phone}
                size="large"
            >
                {statementLoading || !statement?.account ? (
                    <p className="muted">Loading statement...</p>
                ) : (
                    <div className="finance-statement">
                        <div className="finance-statement-summary">
                            <div>
                                <span className="finance-stat-label">Current balance</span>
                                <strong
                                    className={`finance-amount finance-amount--${
                                        Number(statement.account.balance) < 0 ? 'owing' : 'owed'
                                    }`}
                                >
                                    {Number(statement.account.balance) < 0 ? '-' : ''}
                                    {formatMoney(statement.account.balance)}
                                </strong>
                                <span className="finance-stat-hint">
                                    {Number(statement.account.balance) < 0
                                        ? 'Driver owes PickU'
                                        : Number(statement.account.balance) > 0
                                            ? 'PickU owes driver'
                                            : 'Settled'}
                                </span>
                            </div>

                            <div>
                                <span className="finance-stat-label">Bank account</span>
                                {statement.driver.account_number ? (
                                    <>
                                        <strong>{statement.driver.bank_name || '-'}</strong>
                                        <span className="finance-stat-hint">
                                            {statement.driver.account_number} &middot; {statement.driver.account_name}
                                        </span>
                                    </>
                                ) : (
                                    <span className="finance-stat-hint">
                                        No bank details - driver cannot be paid out yet
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="finance-ledger">
                            <div className="finance-ledger-head">
                                <span>Date</span>
                                <span>Description</span>
                                <span className="right">Amount</span>
                                <span className="right">Balance</span>
                            </div>

                            {(statement.transactions?.data || []).length === 0 ? (
                                <p className="muted finance-ledger-empty">No ledger entries yet.</p>
                            ) : (
                                statement.transactions.data.map((line) => (
                                    <div className="finance-ledger-row" key={line.id}>
                                        <span className="muted">{line.posted_at}</span>
                                        <span>
                                            {line.description}
                                            {line.gateway === 'mock' && (
                                                <span className="finance-badge finance-badge--mock">mock</span>
                                            )}
                                        </span>
                                        <span
                                            className={`right finance-amount--${
                                                Number(line.amount) < 0 ? 'owing' : 'owed'
                                            }`}
                                        >
                                            {Number(line.amount) < 0 ? '-' : '+'}{formatMoney(line.amount)}
                                        </span>
                                        <span className="right">{formatMoney(line.balance_after)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={trialOpen}
                onClose={() => { setTrialOpen(false); setTrialBalance(null) }}
                title="Trial balance"
                subtitle="Every account balance must sum to zero"
                size="medium"
            >
                {!trialBalance ? (
                    <p className="muted">Loading trial balance...</p>
                ) : (
                    <div className="finance-trial">
                        <div className={`finance-trial-banner ${trialBalance.balanced ? 'is-ok' : 'is-bad'}`}>
                            <span className="material-icons">
                                {trialBalance.balanced ? 'check_circle' : 'error'}
                            </span>
                            {trialBalance.balanced
                                ? 'Books balance. Debits equal credits and all accounts sum to zero.'
                                : 'Books do NOT balance. Investigate before running any payout.'}
                        </div>

                        <div className="finance-ledger-head finance-trial-head">
                            <span>Account</span>
                            <span>Type</span>
                            <span className="right">Balance</span>
                        </div>

                        {(trialBalance.accounts || []).map((account) => (
                            <div className="finance-trial-row" key={account.code}>
                                <span>{account.code}</span>
                                <span className="muted">{account.type}</span>
                                <span className="right">{formatMoney(account.natural_balance)}</span>
                            </div>
                        ))}

                        <div className="finance-trial-total">
                            <span>Total debits</span>
                            <span className="right">{formatMoney(trialBalance.total_debits)}</span>
                        </div>
                        <div className="finance-trial-total">
                            <span>Total credits</span>
                            <span className="right">{formatMoney(trialBalance.total_credits)}</span>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default Finance
