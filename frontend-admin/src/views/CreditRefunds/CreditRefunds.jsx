import { useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../../context/AdminContext'
import {
    createPaymentCreditRefund,
    fetchPaymentCreditRefunds,
    searchRefundablePayments,
} from '../../services/adminApi'
import './CreditRefunds.css'

const money = (value) => `LKR ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`

const CreditRefunds = () => {
    const { token } = useAdmin()
    const [search, setSearch] = useState('')
    const [results, setResults] = useState([])
    const [details, setDetails] = useState(null)
    const [amount, setAmount] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const findPayment = async (event) => {
        event?.preventDefault()
        if (!search.trim()) {
            Swal.fire('Search required', 'Enter payment, ride, or passenger information.', 'warning')
            return
        }

        try {
            setLoading(true)
            const matches = await searchRefundablePayments(token, search.trim())
            setResults(matches)
            setDetails(null)
            if (matches.length === 0) {
                Swal.fire('No completed payments', 'No completed payment matched that search.', 'info')
            }
        } catch (error) {
            setResults([])
            setDetails(null)
            Swal.fire('Search failed', error.message || 'Could not search payments.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const selectPayment = async (id) => {
        try {
            setLoading(true)
            const result = await fetchPaymentCreditRefunds(token, id)
            setDetails(result)
            setAmount(result.refundable_amount || '')
            setReason('')
        } catch (error) {
            Swal.fire('Payment not available', error.message || 'Could not load this payment.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const submitRefund = async (event) => {
        event.preventDefault()
        const value = Number(amount)
        const remaining = Number(details?.refundable_amount || 0)

        if (!Number.isFinite(value) || value <= 0 || value > remaining) {
            Swal.fire('Invalid amount', `Enter an amount from LKR 0.01 to ${money(remaining)}.`, 'warning')
            return
        }
        if (!reason.trim()) {
            Swal.fire('Reason required', 'Enter a clear reason for the audit record.', 'warning')
            return
        }

        const confirmation = await Swal.fire({
            title: 'Confirm PickU credit refund',
            html: `<p><strong>${money(value)}</strong> will be added to the passenger's PickU credit.</p><p>No money will be returned to the card or as cash. The original payment and driver settlement will remain unchanged.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Issue PickU credit',
            confirmButtonColor: '#087f5b',
        })
        if (!confirmation.isConfirmed) return

        try {
            setSubmitting(true)
            await createPaymentCreditRefund(token, details.payment.id, {
                amount: value.toFixed(2),
                reason: reason.trim(),
                idempotencyKey: crypto.randomUUID(),
            })
            const refreshed = await fetchPaymentCreditRefunds(token, details.payment.id)
            setDetails(refreshed)
            setAmount(refreshed.refundable_amount || '')
            setReason('')
            await Swal.fire('Refund completed', `${money(value)} was added as PickU credit.`, 'success')
        } catch (error) {
            Swal.fire('Refund failed', error.message || 'The refund was not completed.', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const refundable = Number(details?.refundable_amount || 0)
    const completed = details?.payment?.payment_status === 'COMPLETED'

    return (
        <section className="credit-refunds-page">
            <header className="credit-refunds-header">
                <div>
                    <h1>PickU credit refunds</h1>
                    <p>Find a completed payment, verify its passenger, then issue PickU credit.</p>
                </div>
            </header>

            <form className="refund-lookup" onSubmit={findPayment}>
                <label>
                    <span>Find passenger payment</span>
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Payment ID, ride ID/code, passenger ID, email or phone" />
                </label>
                <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search payments'}</button>
            </form>

            {results.length > 0 && (
                <div className="refund-results">
                    <div className="refund-results-heading">
                        <h2>Matching completed payments</h2>
                        <span>{results.length} result{results.length === 1 ? '' : 's'}</span>
                    </div>
                    {results.map((result) => (
                        <button type="button" key={result.payment_id} onClick={() => selectPayment(result.payment_id)}>
                            <div>
                                <strong>{result.passenger_name || `Passenger #${result.passenger_id}`}</strong>
                                <span>{result.passenger_phone || result.passenger_email || `Passenger #${result.passenger_id}`}</span>
                            </div>
                            <div><span>Ride</span><strong>{result.ride_code || `#${result.ride_id}`}</strong></div>
                            <div><span>Payment</span><strong>#{result.payment_id}</strong></div>
                            <div><span>Refundable</span><strong>{money(result.refundable_amount)}</strong></div>
                            <span className="material-icons">chevron_right</span>
                        </button>
                    ))}
                </div>
            )}

            {details && (
                <div className="refund-workspace">
                    <div className="refund-summary">
                        <h2>Payment #{details.payment.id}</h2>
                        <dl>
                            <div><dt>Passenger</dt><dd>{details.passenger.name || `#${details.passenger.id}`}</dd></div>
                            <div><dt>Passenger ID</dt><dd>#{details.passenger.id}</dd></div>
                            <div><dt>Contact</dt><dd>{details.passenger.phone || details.passenger.email || 'Not available'}</dd></div>
                            <div><dt>Ride</dt><dd>{details.ride?.ride_code || `#${details.ride?.id}`}</dd></div>
                            <div><dt>Status</dt><dd>{details.payment.payment_status}</dd></div>
                            <div><dt>Original payment</dt><dd>{money(details.payment.amount)}</dd></div>
                            <div><dt>Already refunded</dt><dd>{money(details.refunded_amount)}</dd></div>
                            <div className="refundable"><dt>Available for refund</dt><dd>{money(details.refundable_amount)}</dd></div>
                        </dl>
                    </div>

                    <form className="refund-form" onSubmit={submitRefund}>
                        <h2>Issue credit refund</h2>
                        <div className="refund-notice">This adds PickU credit. It does not send money through WEBXPAY or change driver earnings.</div>
                        <label><span>Amount (LKR)</span><input type="number" min="0.01" step="0.01" max={refundable} value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
                        <label><span>Reason</span><textarea maxLength="500" rows="4" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this refund is being issued" /></label>
                        <button type="submit" disabled={!completed || refundable <= 0 || submitting}>
                            {submitting ? 'Issuing credit…' : refundable <= 0 ? 'Fully refunded' : 'Review and issue credit'}
                        </button>
                    </form>

                    <div className="refund-history">
                        <h2>Refund history</h2>
                        {details.refunds?.length ? details.refunds.map((refund) => (
                            <article key={refund.id}>
                                <div><strong>{money(refund.amount)}</strong><span>{refund.status}</span></div>
                                <p>{refund.reason}</p>
                                <small>{refund.completed_at ? new Date(refund.completed_at).toLocaleString() : 'Pending'}</small>
                            </article>
                        )) : <p className="empty-refunds">No refunds issued for this payment.</p>}
                    </div>
                </div>
            )}
        </section>
    )
}

export default CreditRefunds
