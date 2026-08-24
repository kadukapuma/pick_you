import { useCallback, useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../../context/AdminContext'
import DataTable from '../../components/DataTable/DataTable'
import SearchBar from '../../components/SearchBar'
import {
    fetchPromotionUsage,
    rewardDriverReferral,
    rewardLoyaltyReferral,
    searchPromotions,
} from '../../services/adminApi'
import './Promotions.css'

const REFERRED_GRID = '2fr 1.5fr 1fr 1.2fr'
const USAGE_GRID = '2fr 1.5fr 1.2fr 1fr'

const createIdempotencyKey = () => {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID()
    }

    if (typeof globalThis.crypto?.getRandomValues === 'function') {
        const values = new Uint32Array(4)
        globalThis.crypto.getRandomValues(values)
        return `promo-${Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('')}`
    }

    return `promo-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

const Promotions = () => {
    const { token } = useAdmin()
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [referredPagination, setReferredPagination] = useState({ page: 1, totalPages: 1, total: 0, perPage: 20 })

    const [driverAmount, setDriverAmount] = useState('')
    const [driverNote, setDriverNote] = useState('')
    const [loyaltyPoints, setLoyaltyPoints] = useState('')
    const [loyaltyNote, setLoyaltyNote] = useState('')
    const [submittingDriver, setSubmittingDriver] = useState(false)
    const [submittingLoyalty, setSubmittingLoyalty] = useState(false)

    const [usageRows, setUsageRows] = useState([])
    const [usageLoading, setUsageLoading] = useState(true)
    const [usageSearch, setUsageSearch] = useState('')
    const [usagePagination, setUsagePagination] = useState({ page: 1, totalPages: 1, total: 0, perPage: 20 })

    const applyResult = (data, page) => {
        setResult(data)
        setReferredPagination({
            page: data.referred_users?.current_page ?? page,
            totalPages: data.referred_users?.last_page ?? 1,
            total: data.referred_users?.total ?? 0,
            perPage: data.referred_users?.per_page ?? 20,
        })
    }

    const runSearch = async (event) => {
        event?.preventDefault()
        if (!phone.trim()) {
            Swal.fire('Phone required', 'Enter the phone number used as a promotion code.', 'warning')
            return
        }

        try {
            setLoading(true)
            const data = await searchPromotions(token, phone.trim(), 1)
            applyResult(data, 1)
            setDriverAmount('')
            setDriverNote('')
            setLoyaltyPoints('')
            setLoyaltyNote('')
        } catch (error) {
            setResult(null)
            Swal.fire('Not found', error.message || 'Could not find this phone number.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const refresh = async (page = referredPagination.page) => {
        const data = await searchPromotions(token, phone.trim(), page)
        applyResult(data, page)
    }

    const loadReferredPage = async (page) => {
        try {
            setLoading(true)
            await refresh(page)
        } catch (error) {
            Swal.fire('Failed', error.message || 'Could not load that page.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const submitDriverReward = async (event) => {
        event.preventDefault()
        const value = Number(driverAmount)
        if (!Number.isFinite(value) || value <= 0) {
            Swal.fire('Invalid amount', 'Enter an amount greater than 0.', 'warning')
            return
        }
        if (!driverNote.trim()) {
            Swal.fire('Note required', 'Enter a note for the audit record.', 'warning')
            return
        }

        const confirmation = await Swal.fire({
            title: 'Confirm referral driver credit',
            html: `<p><strong>LKR ${value.toFixed(2)}</strong> will be credited to ${result.referrer.name || 'this driver'}'s account, the same as a driver settlement credit.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Credit driver',
            confirmButtonColor: '#087f5b',
        })
        if (!confirmation.isConfirmed) return

        try {
            setSubmittingDriver(true)
            await rewardDriverReferral(token, result.referrer.id, {
                amount: value.toFixed(2),
                note: driverNote.trim(),
                idempotencyKey: createIdempotencyKey(),
            })
            await refresh()
            setDriverAmount('')
            setDriverNote('')
            await Swal.fire('Credit issued', `LKR ${value.toFixed(2)} was credited to the driver.`, 'success')
        } catch (error) {
            Swal.fire('Failed', error.message || 'Could not issue the driver credit.', 'error')
        } finally {
            setSubmittingDriver(false)
        }
    }

    const submitLoyaltyReward = async (event) => {
        event.preventDefault()
        const value = Number(loyaltyPoints)
        if (!Number.isFinite(value) || value <= 0) {
            Swal.fire('Invalid points', 'Enter a points value greater than 0.', 'warning')
            return
        }
        if (!loyaltyNote.trim()) {
            Swal.fire('Note required', 'Enter a note for the audit record.', 'warning')
            return
        }

        const confirmation = await Swal.fire({
            title: 'Confirm referral loyalty points',
            html: `<p><strong>${value.toFixed(2)} points</strong> will be added to ${result.referrer.name || 'this passenger'}'s loyalty balance.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Add points',
            confirmButtonColor: '#087f5b',
        })
        if (!confirmation.isConfirmed) return

        try {
            setSubmittingLoyalty(true)
            await rewardLoyaltyReferral(token, result.referrer.id, {
                points: value.toFixed(2),
                note: loyaltyNote.trim(),
                idempotencyKey: createIdempotencyKey(),
            })
            await refresh()
            setLoyaltyPoints('')
            setLoyaltyNote('')
            await Swal.fire('Points added', `${value.toFixed(2)} loyalty points were added.`, 'success')
        } catch (error) {
            Swal.fire('Failed', error.message || 'Could not add loyalty points.', 'error')
        } finally {
            setSubmittingLoyalty(false)
        }
    }

    const loadUsage = useCallback(async (page = 1) => {
        try {
            setUsageLoading(true)
            const data = await fetchPromotionUsage(token, { search: usageSearch.trim(), page })
            setUsageRows(data.data || [])
            setUsagePagination({
                page: data.current_page ?? page,
                totalPages: data.last_page ?? 1,
                total: data.total ?? 0,
                perPage: data.per_page ?? 20,
            })
        } catch (error) {
            Swal.fire('Failed to load', error.message || 'Could not load promo code usage.', 'error')
        } finally {
            setUsageLoading(false)
        }
    }, [token, usageSearch])

    useEffect(() => {
        const timer = setTimeout(() => loadUsage(1), 300)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usageSearch, token])

    return (
        <section className="promotions-page">
            <header className="promotions-header">
                <div>
                    <h1>Referral promotions</h1>
                    <p>Look up who used a phone number as a promotion code, then reward the referrer.</p>
                </div>
            </header>

            <form className="promotions-lookup" onSubmit={runSearch}>
                <label>
                    <span>Promotion code (phone number)</span>
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 0771234567" />
                </label>
                <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
            </form>

            {result && (
                <div className="promotions-workspace">
                    <div className="promotions-summary">
                        <h2>{result.referrer.name || `User #${result.referrer.id}`}</h2>
                        <dl>
                            <div><dt>Phone</dt><dd>{result.referrer.phone}</dd></div>
                            <div><dt>Roles</dt><dd>{(result.referrer.roles || []).join(', ') || 'none'}</dd></div>
                            {result.referrer.is_driver && (
                                <div><dt>Total rides (driver)</dt><dd>{result.referrer.total_rides_as_driver ?? 0}</dd></div>
                            )}
                            {result.referrer.is_passenger && (
                                <div><dt>Total rides (passenger)</dt><dd>{result.referrer.total_rides_as_passenger ?? 0}</dd></div>
                            )}
                            <div className="referred-count"><dt>Referred signups</dt><dd>{result.referred_count}</dd></div>
                        </dl>

                        {!result.referrer.is_driver && !result.referrer.is_passenger && (
                            <p className="promotions-notice">This user has no driver or passenger profile, so no reward can be issued.</p>
                        )}
                    </div>

                    <div className="promotions-actions">
                        {result.referrer.is_driver && (
                            <form className="promotions-action-form" onSubmit={submitDriverReward}>
                                <h3>Credit driver account</h3>
                                <label><span>Amount (LKR)</span><input type="number" min="0.01" step="0.01" value={driverAmount} onChange={(event) => setDriverAmount(event.target.value)} /></label>
                                <label><span>Note</span><textarea maxLength="500" rows="3" value={driverNote} onChange={(event) => setDriverNote(event.target.value)} placeholder="e.g. Referral bonus for 5 signups" /></label>
                                <button type="submit" disabled={submittingDriver}>{submittingDriver ? 'Crediting…' : 'Credit driver'}</button>
                            </form>
                        )}

                        {result.referrer.is_passenger && (
                            <form className="promotions-action-form" onSubmit={submitLoyaltyReward}>
                                <h3>Add loyalty points</h3>
                                <label><span>Points</span><input type="number" min="0.01" step="0.01" value={loyaltyPoints} onChange={(event) => setLoyaltyPoints(event.target.value)} /></label>
                                <label><span>Note</span><textarea maxLength="500" rows="3" value={loyaltyNote} onChange={(event) => setLoyaltyNote(event.target.value)} placeholder="e.g. Referral bonus for 5 signups" /></label>
                                <button type="submit" disabled={submittingLoyalty}>{submittingLoyalty ? 'Adding…' : 'Add points'}</button>
                            </form>
                        )}
                    </div>

                    <div className="promotions-referred">
                        <h2>Referred signups</h2>
                        <DataTable
                            headers={['Name', 'Phone', 'Roles', 'Registered']}
                            gridTemplate={REFERRED_GRID}
                            pagination={{ ...referredPagination, onPageChange: loadReferredPage }}
                        >
                            {result.referred_users?.data?.length ? result.referred_users.data.map((user) => (
                                <div className="table-row" key={user.id} style={{ gridTemplateColumns: REFERRED_GRID }}>
                                    <strong>{user.name || `#${user.id}`}</strong>
                                    <span>{user.phone}</span>
                                    <span>{(user.roles || []).join(', ')}</span>
                                    <span>{user.registered_at ? new Date(user.registered_at).toLocaleString() : ''}</span>
                                </div>
                            )) : (
                                <div className="table-row" style={{ gridTemplateColumns: REFERRED_GRID }}>
                                    <span className="promotions-empty" style={{ gridColumn: '1 / -1' }}>Nobody has registered with this code yet.</span>
                                </div>
                            )}
                        </DataTable>
                    </div>

                    <div className="promotions-rewards">
                        <h2>Rewards already issued</h2>
                        {result.rewards?.length ? result.rewards.map((reward) => (
                            <article key={reward.id}>
                                <div>
                                    <strong>{reward.reward_type === 'driver_credit' ? `LKR ${Number(reward.amount).toFixed(2)}` : `${Number(reward.amount).toFixed(2)} pts`}</strong>
                                    <span>{reward.reward_type === 'driver_credit' ? 'Driver credit' : 'Loyalty points'}</span>
                                </div>
                                <p>{reward.note}</p>
                                <small>{reward.created_at ? new Date(reward.created_at).toLocaleString() : ''}</small>
                            </article>
                        )) : <p className="promotions-empty">No rewards issued for this referrer yet.</p>}
                    </div>
                </div>
            )}

            <div className="promotions-usage">
                <div className="promotions-usage-header">
                    <h2>All users — promotion code usage</h2>
                    <SearchBar
                        value={usageSearch}
                        onChange={setUsageSearch}
                        placeholder="Search by name or phone"
                    />
                </div>
                <DataTable
                    headers={['Name', 'Phone', 'Roles', 'Used as promo code']}
                    gridTemplate={USAGE_GRID}
                    pagination={{ ...usagePagination, onPageChange: loadUsage }}
                >
                    {usageLoading ? (
                        <div className="table-row" style={{ gridTemplateColumns: USAGE_GRID }}>
                            <span className="promotions-empty" style={{ gridColumn: '1 / -1' }}>Loading…</span>
                        </div>
                    ) : usageRows.length ? usageRows.map((user) => (
                        <div className="table-row" key={user.id} style={{ gridTemplateColumns: USAGE_GRID }}>
                            <strong>{user.name || `#${user.id}`}</strong>
                            <span>{user.phone}</span>
                            <span>{(user.roles || []).join(', ')}</span>
                            <span>{user.promo_code_use_count}</span>
                        </div>
                    )) : (
                        <div className="table-row" style={{ gridTemplateColumns: USAGE_GRID }}>
                            <span className="promotions-empty" style={{ gridColumn: '1 / -1' }}>No users found.</span>
                        </div>
                    )}
                </DataTable>
            </div>
        </section>
    )
}

export default Promotions
