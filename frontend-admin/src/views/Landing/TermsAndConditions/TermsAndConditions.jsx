import React from 'react';
import './TermsAndConditions.css';

const sections = [
    {
        number: '01',
        title: 'Driver Eligibility',
        intro: 'To drive with PickU, you must:',
        items: [
            'Be at least 18 years old',
            'Hold a valid driving license',
            'Provide accurate registration information',
            'Maintain required vehicle documentation',
        ],
    },
    {
        number: '02',
        title: 'Driver Responsibilities',
        intro: 'As a driver, you agree to:',
        items: [
            'Operate vehicles safely',
            'Follow local traffic laws',
            'Maintain professional behavior',
            'Keep account information accurate',
            'Protect passenger safety and privacy',
        ],
    },
    {
        number: '03',
        title: 'Account Verification',
        paragraphs: [
            'PickU may verify driver identity and vehicle documentation before account approval.',
        ],
        note: 'Submission of false information may result in account suspension or termination.',
    },
    {
        number: '04',
        title: 'App Permissions',
        intro: 'To use core driver features, you must grant PickU Driver certain device permissions:',
        items: [
            'Location (Foreground) — to show nearby ride requests and provide navigation.',
            'Location (Background) — collected even when the app is closed or not in use, only while you are online, to receive dispatch requests and keep passengers updated on your arrival.',
            'Camera — to capture and upload documents and vehicle photos for verification.',
        ],
        note: 'Background location access is requested only after you review and agree to an in-app disclosure screen. You may decline, but you will not be able to go online and receive trips until it is granted. Permissions can be changed anytime in your device Settings.',
    },
    {
        number: '05',
        title: 'Ride Acceptance',
        paragraphs: [
            'Drivers may receive ride requests through the application.',
            'Repeated cancellation, misuse, or abuse of the platform may affect account status.',
        ],
    },
    {
        number: '06',
        title: 'Payments',
        paragraphs: [
            'Drivers may receive earnings based on completed trips according to PickU policies.',
            'Payment schedules and commission structures may be updated from time to time.',
        ],
    },
    {
        number: '07',
        title: 'Prohibited Activities',
        intro: 'Drivers must not:',
        items: [
            'Share accounts with others',
            'Use fraudulent documents',
            'Engage in illegal activities',
            'Harass passengers',
            'Manipulate fares or ride information',
        ],
    },
    {
        number: '08',
        title: 'Suspension and Termination',
        intro: 'PickU reserves the right to suspend or terminate accounts for:',
        items: [
            'Violations of these terms',
            'Fraudulent activities',
            'Unsafe driving behavior',
            'Abuse of the platform',
        ],
    },
    {
        number: '09',
        title: 'Limitation of Liability & Changes to Terms',
        paragraphs: [
            'PickU provides the platform on an "as available" basis and is not responsible for losses arising from service interruptions, technical failures, or events beyond our control.',
            'PickU may update these Terms and Conditions at any time. Continued use of the application constitutes acceptance of updated terms.',
        ],
    },
];

const TermsAndConditions = () => {
    return (
        <div className="legal-page-container">
            <header className="legal-page-header">
                <p className="legal-eyebrow">PickU Driver Agreement</p>
                <h1>Terms and Conditions</h1>
                <p className="effective-date">Effective June 2026</p>
                <p className="legal-intro">
                    By using the PickU Driver application, you agree to the terms set out below.
                </p>
            </header>

            <div className="legal-toc">
                {sections.map((s) => (
                    <a key={s.number} href={`#section-${s.number}`} className="legal-toc-item">
                        <span className="legal-toc-number">{s.number}</span>
                        <span>{s.title}</span>
                    </a>
                ))}
                <a href="#section-contact" className="legal-toc-item">
                    <span className="legal-toc-number">10</span>
                    <span>Contact</span>
                </a>
            </div>

            <main className="legal-content">
                {sections.map((s) => (
                    <section key={s.number} id={`section-${s.number}`} className="legal-section">
                        <div className="legal-section-heading">
                            <span className="legal-section-number">{s.number}</span>
                            <h2>{s.title}</h2>
                        </div>

                        {s.paragraphs && s.paragraphs.map((p, i) => (
                            <p key={i}>{p}</p>
                        ))}

                        {s.intro && <p>{s.intro}</p>}

                        {s.items && (
                            <ul className="legal-list">
                                {s.items.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        )}

                        {s.note && <p className="legal-note">{s.note}</p>}
                    </section>
                ))}

                <section id="section-contact" className="legal-section legal-contact">
                    <div className="legal-section-heading">
                        <span className="legal-section-number">10</span>
                        <h2>Contact Information</h2>
                    </div>
                    <p>For support or inquiries about these terms, reach out to:</p>
                    <a href="mailto:support@picku.lk" className="legal-contact-link">
                        support@picku.lk
                    </a>
                </section>
            </main>
        </div>
    );
};

export default TermsAndConditions;