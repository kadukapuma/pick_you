import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaCommentDots,
  FaRocket,
  FaCreditCard,
  FaMoneyBillWave,
  FaMobileAlt,
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";

import "./LandingLayout.css";

import logo from "../../../assets/logo.png";

import Home from "../Home";
import AboutUs from "../AboutUs";
import ContactUs from "../ContactUs";

const LandingLayout = () => {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNearFooter, setIsNearFooter] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const homeRef = useRef(null);
  const aboutRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Scroll progress bar
      const progress = (currentScrollY / (documentHeight - windowHeight)) * 100;
      setScrollProgress(Math.min(progress, 100));

      const isNearBottom =
        currentScrollY + windowHeight >= documentHeight - 150;
      setIsNearFooter(isNearBottom);

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsHeaderVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (sectionRef) => {
    if (sectionRef.current) {
      const headerOffset = 80;
      const elementPosition = sectionRef.current.offsetTop;
      let offsetPosition = elementPosition - headerOffset;
      if (sectionRef === footerRef) offsetPosition = elementPosition;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });

  return (
    <div className="landing-shell">
      {/* Progress bar */}
      <div
        className="scroll-progress"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* HEADER */}
      <header
        className={`landing-header ${!isHeaderVisible ? "header-hidden" : ""}`}
      >
        <div className="landing-logo">
          <img src={logo} alt="PickYou Logo" className="logo-image" />
        </div>

        <nav className="landing-nav">
          <button onClick={() => scrollToSection(homeRef)} className="nav-link">
            Home
          </button>
          <button
            onClick={() => scrollToSection(aboutRef)}
            className="nav-link"
          >
            About Us
          </button>
          <button
            onClick={() => scrollToSection(footerRef)}
            className="nav-link"
          >
            Contact Us
          </button>
          <Link to="/admin-portal/login" className="staff-login-link">
            Staff Login
          </Link>
        </nav>
      </header>

      {/* MAIN */}
      <main className="landing-main">
        <div ref={homeRef} id="home" className="section-container">
          <Home />
        </div>
        <div ref={aboutRef} id="about" className="section-container">
          <AboutUs />
        </div>
      </main>

      {/* FOOTER */}
      <footer ref={footerRef} className="landing-footer">
        <div className="footer-content">
          {/* Col 1 – Brand */}
          <div className="footer-section">
            <img src={logo} alt="PickYou Logo" className="footer-logo" />
            <p className="footer-description">
              Revolutionizing urban mobility with technology and trust. Safe,
              reliable, and affordable rides for everyone.
            </p>
            <div className="social-icons">
              <a href="#" className="social-icon" aria-label="Facebook">
                {" "}
                <FaFacebookF />
              </a>
              <a href="#" className="social-icon" aria-label="Twitter">
                {" "}
                <FaTwitter />
              </a>
              <a href="#" className="social-icon" aria-label="Instagram">
                {" "}
                <FaInstagram />
              </a>
              <a href="#" className="social-icon" aria-label="LinkedIn">
                {" "}
                <FaLinkedinIn />
              </a>
            </div>
          </div>

          {/* Col 2 – Contact Form */}
          <div className="footer-section">
            <h3>Send us a Message</h3>
            <ContactUs />
          </div>

          {/* Col 3 – Contact Info */}
          <div className="footer-section">
            <h3>Contact Info</h3>
            <div className="contact-info">
              <div className="contact-item">
                <FaMapMarkerAlt className="contact-icon" />
                <span>123 Transportation Ave, New York, NY 10001</span>
              </div>
              <div className="contact-item">
                <FaEnvelope className="contact-icon" />
                <a href="mailto:support@pickyou.com">support@pickyou.com</a>
              </div>
              <div className="contact-item">
                <FaPhone className="contact-icon" />
                <a href="tel:+15551234567">+1 (555) 123-4567</a>
              </div>
              <div className="contact-item">
                <FaCommentDots className="contact-icon" />
                <span>24/7 Customer Support</span>
              </div>
            </div>

            <h3 className="hours-title">Business Hours</h3>
            <div className="hours-info">
              <div className="hours-item">
                <span>Mon – Fri</span>
                <span>9:00 AM – 6:00 PM</span>
              </div>
              <div className="hours-item">
                <span>Saturday</span>
                <span>10:00 AM – 4:00 PM</span>
              </div>
              <div className="hours-item">
                <span>Sunday</span>
                <span>Closed</span>
              </div>
            </div>
            <div className="support-badge">
              <FaRocket />
              <span>Emergency Support: 24/7</span>
            </div>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} PickYou. All rights reserved.</p>
          <div className="payment-methods">
            <FaCreditCard className="pay-icon" title="Credit Card" />
            <FaMoneyBillWave className="pay-icon" title="Cash" />
            <FaMobileAlt className="pay-icon" title="Mobile Pay" />
          </div>
        </div>
      </footer>

      {/* SCROLL BUTTONS */}
      {!isHeaderVisible && !isNearFooter && (
        <div className="scroll-buttons">
          <button
            className="scroll-btn scroll-top"
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <FaChevronUp />
          </button>
          <button
            className="scroll-btn scroll-bottom"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <FaChevronDown />
          </button>
        </div>
      )}
    </div>
  );
};

export default LandingLayout;
