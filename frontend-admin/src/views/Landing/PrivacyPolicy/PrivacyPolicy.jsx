import React from 'react';
import { FaUserShield, FaCar, FaMapMarkerAlt, FaLock, FaDatabase, FaGavel, FaEnvelope } from 'react-icons/fa';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
    return (
        <div className="legal-page-container">
            <div className="legal-page-header-wrapper">
                <div className="legal-page-header">
                    <div className="header-icon-container">
                        <FaUserShield className="header-main-icon" />
                    </div>
                    <h1>PickU Driver Privacy Policy</h1>
                    <p className="effective-date">Effective Date: June 2026</p>
                </div>
            </div>

            <div className="legal-page-content">
                <section className="legal-intro">
                    <p>
                        Welcome to PickU Driver. Your privacy is important to us. This Privacy Policy explains
                        how we collect, use, and protect your information when using the PickU Driver mobile application.
                    </p>
                </section>

                <div className="legal-card-grid">
                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaDatabase className="section-icon text-blue" />
                            <h2>Information We Collect</h2>
                        </div>
                        <p>We may collect the following information:</p>

                        <div className="info-subsection">
                            <h3>Personal Information</h3>
                            <ul>
                                <li>Full Name</li>
                                <li>Phone Number</li>
                                <li>Email Address</li>
                                <li>National Identity Card Number</li>
                                <li>Driver License Information</li>
                            </ul>
                        </div>

                        <div className="info-subsection">
                            <h3>Vehicle Information</h3>
                            <ul>
                                <li>Vehicle Registration Details</li>
                                <li>Vehicle Type</li>
                                <li>Vehicle Insurance Information</li>
                            </ul>
                        </div>

                        <div className="info-subsection">
                            <h3>Location Information</h3>
                            <ul>
                                <li>Real-time GPS location while the driver is online</li>
                                <li>Route and trip-related location information</li>
                            </ul>
                        </div>

                        <div className="info-subsection">
                            <h3>Device Information</h3>
                            <ul>
                                <li>Device Model</li>
                                <li>Operating System Version</li>
                                <li>App Version</li>
                                <li>Device Identifiers</li>
                            </ul>
                        </div>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaCar className="section-icon text-green" />
                            <h2>How We Use Information</h2>
                        </div>
                        <p>We use collected information to:</p>
                        <ul className="custom-bullet-list">
                            <li>Create and manage driver accounts</li>
                            <li>Verify driver identity</li>
                            <li>Match drivers with passengers</li>
                            <li>Provide navigation and trip services</li>
                            <li>Improve application performance</li>
                            <li>Ensure platform safety and security</li>
                            <li>Comply with legal requirements</li>
                        </ul>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaMapMarkerAlt className="section-icon text-red" />
                            <h2>Location Services</h2>
                        </div>
                        <p>PickU Driver collects location data while drivers are online or actively using the application to:</p>
                        <ul className="custom-bullet-list">
                            <li>Receive ride requests</li>
                            <li>Navigate to pickup locations</li>
                            <li>Track trip progress</li>
                            <li>Improve service reliability</li>
                        </ul>
                        <div className="alert-box info">
                            <p>Location data may continue to be collected while the app is running in the background when a driver is online.</p>
                        </div>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaUserShield className="section-icon text-purple" />
                            <h2>Information Sharing</h2>
                        </div>
                        <p className="emphasis-text">We do not sell personal information.</p>
                        <p>Information may be shared with:</p>
                        <ul className="custom-bullet-list">
                            <li>Passengers during active trips</li>
                            <li>Service providers supporting our platform</li>
                            <li>Government authorities when legally required</li>
                        </ul>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaLock className="section-icon text-yellow" />
                            <h2>Data Security & Retention</h2>
                        </div>
                        <p>
                            We implement reasonable security measures to protect user information from
                            unauthorized access, disclosure, or misuse.
                        </p>
                        <p>
                            We retain information only as long as necessary to provide services,
                            comply with legal obligations, and resolve disputes.
                        </p>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaGavel className="section-icon text-dark" />
                            <h2>Your Rights</h2>
                        </div>
                        <p>Drivers may:</p>
                        <ul className="custom-bullet-list">
                            <li>Request account information</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request account deletion where legally permitted</li>
                        </ul>
                    </section>

                    <section className="legal-section-card contact-card">
                        <div className="section-title-wrapper">
                            <FaEnvelope className="section-icon text-teal" />
                            <h2>Contact Us</h2>
                        </div>
                        <p>For questions regarding this Privacy Policy:</p>
                        <a href="mailto:support@picku.lk" className="contact-email-btn">
                            support@picku.lk
                        </a>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
