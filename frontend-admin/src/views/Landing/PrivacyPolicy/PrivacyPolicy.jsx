import React from 'react';
import './PrivacyPolicy.css';

const sections = [
    {
        number: '01',
        title: 'Information We Collect',
        intro: 'We may collect the following information:',
        subsections: [
            {
                heading: 'Personal Information',
                items: ['Full Name', 'Phone Number', 'Email Address', 'National Identity Card Number', 'Driver License Information'],
            },
            {
                heading: 'Vehicle Information',
                items: ['Vehicle Registration Details', 'Vehicle Type', 'Vehicle Insurance Information'],
            },
            {
                heading: 'Location Information',
                items: ['Real-time GPS location while the driver is online', 'Route and trip-related location information'],
            },
            {
                heading: 'Device Information',
                items: ['Device Model', 'Operating System Version', 'App Version', 'Device Identifiers'],
            },
        ],
    },
    {
        number: '02',
        title: 'How We Use Information',
        intro: 'We use collected information to:',
        items: [
            'Create and manage driver accounts',
            'Verify driver identity',
            'Match drivers with passengers',
            'Provide navigation and trip services',
            'Improve application performance',
            'Ensure platform safety and security',
            'Comply with legal requirements',
        ],
    },
    {
        number: '03',
        title: 'Location Services',
        intro: 'PickU Driver collects location data while drivers are online or actively using the application to:',
        items: [
            'Receive ride requests',
            'Navigate to pickup locations',
            'Track trip progress',
            'Improve service reliability',
        ],
        note: 'Location data may continue to be collected while the app is running in the background when a driver is online.',
    },
    {
        number: '04',
        title: 'Information Sharing',
        emphasis: 'We do not sell personal information.',
        intro: 'Information may be shared with:',
        items: [
            'Passengers during active trips',
            'Service providers supporting our platform',
            'Government authorities when legally required',
        ],
    },
    {
        number: '05',
        title: 'Data Security & Retention',
        paragraphs: [
            'We implement reasonable security measures to protect user information from unauthorized access, disclosure, or misuse.',
            'We retain information only as long as necessary to provide services, comply with legal obligations, and resolve disputes.',
        ],
    },
    {
        number: '06',
        title: 'Your Rights',
        intro: 'Drivers may:',
        items: [
            'Request account information',
            'Request correction of inaccurate data',
            'Request account deletion where legally permitted',
        ],
    },
];

const PrivacyPolicy = () => {
    return (
        <div className="legal-page-container">
            <header className="legal-page-header">
                <p className="legal-eyebrow">PickU Driver Agreement</p>
                <h1>Privacy Policy</h1>
                <p className="effective-date">Effective June 2026</p>
                <p className="legal-intro">
                    Welcome to PickU Driver. Your privacy is important to us. This Privacy Policy explains
                    how we collect, use, and protect your information when using the PickU Driver mobile application.
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
                    <span className="legal-toc-number">07</span>
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

                        {s.emphasis && <p className="legal-emphasis">{s.emphasis}</p>}

                        {s.intro && <p>{s.intro}</p>}

                        {s.items && (
                            <ul className="legal-list">
                                {s.items.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        )}

                        {s.subsections && s.subsections.map((sub, i) => (
                            <div key={i} className="legal-subsection">
                                <h3>{sub.heading}</h3>
                                <ul className="legal-list legal-list-tight">
                                    {sub.items.map((item, j) => (
                                        <li key={j}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {s.note && <p className="legal-note">{s.note}</p>}
                    </section>
                ))}

                <section id="section-contact" className="legal-section legal-contact">
                    <div className="legal-section-heading">
                        <span className="legal-section-number">07</span>
                        <h2>Contact Us</h2>
                    </div>
                    <p>For questions regarding this Privacy Policy:</p>
                    <a href="mailto:support@picku.lk" className="legal-contact-link">
                        support@picku.lk
                    </a>
                </section>
            </main>
        </div>
    );
};

export default PrivacyPolicy;