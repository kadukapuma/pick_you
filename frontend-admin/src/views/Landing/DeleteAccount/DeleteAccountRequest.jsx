import { useState } from 'react';
import { useParams } from 'react-router-dom';
import './DeleteAccountRequest.css';

const FORM_ENDPOINT = 'https://formspree.io/f/xnpnzleg';

const APP_LABELS = {
    driver: 'PickU Driver',
    passenger: 'PickU',
};

const DeleteAccountRequest = () => {
    const { appType } = useParams();
    const appLabel = APP_LABELS[appType] || 'PickU';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        reason: '',
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim() || !formData.email.trim()) {
            setError('Please fill in your name and account email.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(FORM_ENDPOINT, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app: appLabel,
                    name: formData.name,
                    email: formData.email,
                    reason: formData.reason,
                    requestedAt: new Date().toISOString(),
                }),
            });

            if (!response.ok) throw new Error('Request failed');

            setShowConfirmation(true);
            setFormData({ name: '', email: '', reason: '' });
        } catch (err) {
            setError('Something went wrong sending your request. Please try again in a moment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="delete-account-page">
            <header className="delete-account-header">
                <p className="delete-account-eyebrow">{appLabel} Account</p>
                <h1>Request Account Deletion</h1>
                <p className="delete-account-intro">
                    Submitting this form sends a request to our team to permanently delete your{' '}
                    {appLabel} account and associated data.
                </p>
            </header>

            <form className="delete-account-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Name *</label>
                    <input
                        id="name"
                        type="text"
                        name="name"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Account email *</label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="reason">Reason for deletion (optional)</label>
                    <textarea
                        id="reason"
                        name="reason"
                        rows="4"
                        placeholder="Let us know why you're leaving (optional)"
                        value={formData.reason}
                        onChange={handleChange}
                    />
                </div>
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting…' : 'Submit Deletion Request'}
                </button>
                {error && <div className="form-message error">{error}</div>}
            </form>

            {showConfirmation && (
                <div className="delete-account-modal-overlay">
                    <div className="delete-account-modal">
                        <h2>Request received</h2>
                        <p>
                            Your account deletion request has been sent to our admin team. It will be
                            reviewed and your account will be deactivated and deleted within 48 hours.
                        </p>
                        <button className="submit-btn" onClick={() => setShowConfirmation(false)}>
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeleteAccountRequest;
