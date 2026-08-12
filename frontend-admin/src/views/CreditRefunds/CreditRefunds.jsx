import { useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../../context/AdminContext'
import {
    createPaymentCreditRefund,
    fetchPaymentCreditRefunds,
} from '../../services/adminApi'
import './CreditRefunds.css'

const money = (value) => `LKR ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`

const CreditRefunds = () => {
    const { token } = useAdmin()
    const [paymentId, setPaymentId] = useState('')
    const [details, setDetails] = useState(null)
    const [amount, setAmount] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const findPayment = async (event) => {
        event?.preventDefault()
        if (!/^\d+$/.test(paymentId.trim())) {
            Swal.fire('Invalid payment ID', 'Enter a numeric payment ID.', 'warning')
            return
        }

        try {
            setLoading(true)
            const result = await fetchPaymentCreditRefunds(token, paymentId.trim())
            setDetails(result)
            setAmount(result.refundable_amount || '')
            setReason('')
        } catch (error) {
            setDetails(null)
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
                    <p>Issue audited service refunds as PickU credit only.</p>
                </div>
            </header>

            <form className="refund-lookup" onSubmit={findPayment}>
                <label>
                    <span>Payment ID</span>
                    <input value={paymentId} onChange={(event) => setPaymentId(event.target.value)} placeholder="Example: 32" inputMode="numeric" />
                </label>
                <button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Find payment'}</button>
            </form>

            {details && (
                <div className="refund-workspace">
                    <div className="refund-summary">
                        <h2>Payment #{details.payment.id}</h2>
                        <dl>
                            <div><dt>Passenger</dt><dd>{details.passenger.name || `#${details.passenger.id}`}</dd></div>
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
