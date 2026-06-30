import React from 'react';
import { FaFileSignature, FaUserCheck, FaShieldAlt, FaCar, FaWallet, FaBan, FaExclamationTriangle, FaEnvelope, FaPenNib } from 'react-icons/fa';
import '../PrivacyPolicy/PrivacyPolicy.css'; // Reusing the enhanced styles

const TermsAndConditions = () => {
    return (
        <div className="legal-page-container">
            <div className="legal-page-header-wrapper">
                <div className="legal-page-header">
                    <div className="header-icon-container">
                        <FaFileSignature className="header-main-icon" />
                    </div>
                    <h1>PickU Driver Terms and Conditions</h1>
                    <p className="effective-date">Effective Date: June 2026</p>
                </div>
            </div>

            <div className="legal-page-content">
                <section className="legal-intro">
                    <p>
                        By using the PickU Driver application, you agree to the following terms.
                    </p>
                </section>

                <div className="legal-card-grid">
                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaUserCheck className="section-icon text-blue" />
                            <h2>Driver Eligibility</h2>
                        </div>
                        <p>Drivers must:</p>
                        <ul className="custom-bullet-list">
                            <li>Be at least 18 years old</li>
                            <li>Hold a valid driving license</li>
                            <li>Provide accurate registration information</li>
                            <li>Maintain required vehicle documentation</li>
                        </ul>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaShieldAlt className="section-icon text-green" />
                            <h2>Driver Responsibilities</h2>
                        </div>
                        <p>Drivers agree to:</p>
                        <ul className="custom-bullet-list">
                            <li>Operate vehicles safely</li>
                            <li>Follow local traffic laws</li>
                            <li>Maintain professional behavior</li>
                            <li>Keep account information accurate</li>
                            <li>Protect passenger safety and privacy</li>
                        </ul>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaPenNib className="section-icon text-purple" />
                            <h2>Account Verification</h2>
                        </div>
                        <p>
                            PickU may verify driver identity and vehicle documentation before account approval.
                        </p>
                        <div className="alert-box warning">
                            <p>Submission of false information may result in account suspension or termination.</p>
                        </div>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaCar className="section-icon text-teal" />
                            <h2>Ride Acceptance</h2>
                        </div>
                        <p>
                            Drivers may receive ride requests through the application.
                        </p>
                        <p>
                            Repeated cancellation, misuse, or abuse of the platform may affect account status.
                        </p>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaWallet className="section-icon text-yellow" />
                            <h2>Payments</h2>
                        </div>
                        <p>
                            Drivers may receive earnings based on completed trips according to PickU policies.
                        </p>
                        <p>
                            Payment schedules and commission structures may be updated from time to time.
                        </p>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaBan className="section-icon text-red" />
                            <h2>Prohibited Activities</h2>
                        </div>
                        <p>Drivers must not:</p>
                        <ul className="custom-bullet-list">
                            <li>Share accounts with others</li>
                            <li>Use fraudulent documents</li>
                            <li>Engage in illegal activities</li>
                            <li>Harass passengers</li>
                            <li>Manipulate fares or ride information</li>
                        </ul>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaExclamationTriangle className="section-icon text-orange" />
                            <h2>Suspension and Termination</h2>
                        </div>
                        <p>PickU reserves the right to suspend or terminate accounts for:</p>
                        <ul className="custom-bullet-list">
                            <li>Violations of these terms</li>
                            <li>Fraudulent activities</li>
                            <li>Unsafe driving behavior</li>
                            <li>Abuse of the platform</li>
                        </ul>
                    </section>

                    <section className="legal-section-card">
                        <div className="section-title-wrapper">
                            <FaFileSignature className="section-icon text-gray" />
                            <h2>Limitation of Liability & Changes to Terms</h2>
                        </div>
                        <p>
                            PickU provides the platform on an "as available" basis and is not responsible for losses
                            arising from service interruptions, technical failures, or events beyond our control.
                        </p>
                        <hr className="subtle-divider" />
                        <p>
                            PickU may update these Terms and Conditions at any time. Continued use of the application
                            constitutes acceptance of updated terms.
                        </p>
                    </section>

                    <section className="legal-section-card contact-card">
                        <div className="section-title-wrapper">
                            <FaEnvelope className="section-icon text-teal" />
                            <h2>Contact Information</h2>
                        </div>
                        <p>For support or inquiries:</p>
                        <a href="mailto:support@picku.lk" className="contact-email-btn">
                            support@picku.lk
                        </a>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;
