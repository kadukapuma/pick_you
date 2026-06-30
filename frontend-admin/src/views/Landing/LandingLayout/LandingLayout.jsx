import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  FaBars,
  FaTimes,
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
  FaUserCircle,
} from "react-icons/fa";

import "./LandingLayout.css";

import logo from "../../../assets/logo.png";

// ─── Section Components ───────────────────────────────────────────────────────
import Home from "../Home";
import AboutUs from "../AboutUs";
import ContactUs from "../ContactUs";
import Benefits from "../Benefits";
import RideTypes from "../RideTypes";
import Download from "../Download";
import ForDrivers from "../ForDrivers";
// ─────────────────────────────────────────────────────────────────────────────

const LandingLayout = () => {
  // ─── State: Header Visibility & Scroll Tracking ────────────────────────────
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";
  const [activeSection, setActiveSection] = useState("home");
  // ───────────────────────────────────────────────────────────────────────────

  // ─── Refs: Section Anchors for Smooth Scroll Navigation ───────────────────
  const homeRef = useRef(null);
  const aboutRef = useRef(null);
  const benefitsRef = useRef(null);
  const rideTypesRef = useRef(null);
  const downloadRef = useRef(null);
  const driversRef = useRef(null);
  const footerRef = useRef(null);
  // ───────────────────────────────────────────────────────────────────────────

  // ─── Effect: Scroll Event — Progress Bar, Header Hide/Show, Footer Detect ─
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const isMobile = window.innerWidth <= 900;

      const progress = (currentScrollY / (documentHeight - windowHeight)) * 100;
      setScrollProgress(Math.min(progress, 100));

      // Only hide header on desktop; keep it pinned on mobile/tablet
      if (!isMobile) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsHeaderVisible(false);
        } else if (currentScrollY < lastScrollY) {
          setIsHeaderVisible(true);
        }
      } else {
        setIsHeaderVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);
  // ───────────────────────────────────────────────────────────────────────────

  // ─── Effect: Scroll to top on route change ───────────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // ─── Effect: Reset activeSection when navigating away from / ───────────────
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveSection(null);
    } else {
      setActiveSection("home");
    }
  }, [location.pathname]);
  // ───────────────────────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────

  // ─── Effect: Scroll-based Section Detection (Intersection Observer) ──────
  useEffect(() => {
    if (location.pathname !== "/") return;

    const sectionIds = [
      "home",
      "about",
      "benefits",
      "freedom",
      "ride-types",
      "download",
    ];

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  // Handle hash scrolling for cross-page navigation
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          window.scrollTo({
            top: element.offsetTop - 80,
            behavior: "smooth",
          });
        }
      }, 500); // Wait for page content to settle
    }
  }, [location.hash, location.pathname]);
  // ───────────────────────────────────────────────────────────────────────────

  // ─── Helpers: Navigation & Scroll Utilities ────────────────────────────────
  const handleNavClick = (targetId, path = "/") => {
    setIsMenuOpen(false);
    setActiveSection(targetId);
    if (location.pathname === path) {
      const element = document.getElementById(targetId);
      if (element) {
        const offsetPosition = element.offsetTop - 80;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    } else {
      navigate(path);
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          window.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
        }
      }, 300);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="landing-shell">
      {/* ── Scroll Progress Bar ─────────────────────────────────────────────── */}
      <div
        className="scroll-progress"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ── HEADER: Logo | Nav Links | Staff Login & CTA ────────────────────── */}
      <header
        className={`landing-header ${!isHeaderVisible ? "header-hidden" : ""}`}
      >
        {/* Backdrop overlay when mobile menu is open */}
        {isMenuOpen && <div className="menu-backdrop" onClick={() => setIsMenuOpen(false)} />}

        <div className="header-inner">
          {/* Left: Logo */}
          <div className="landing-logo">
            <img src={logo} alt="PickYou Logo" className="logo-image" />
          </div>

          {/* Mobile Menu Toggle */}
          <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>

          {/* Center: Nav links / Mobile sidebar */}
          <nav className={`landing-nav ${isMenuOpen ? "menu-open" : ""}`}>
            <button
              onClick={() => handleNavClick("home")}
              className={`nav-link ${activeSection === "home" ? "nav-link-active" : ""}`}
            >
              Home
            </button>
            <NavLink
              to="/about"
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              About Us
            </NavLink>
            <button
              onClick={() => handleNavClick("ride-types")}
              className={`nav-link ${activeSection === "ride-types" ? "nav-link-active" : ""}`}
            >
              Ride Types
            </button>
            <button
              onClick={() => handleNavClick("benefits")}
              className={`nav-link ${activeSection === "benefits" ? "nav-link-active" : ""}`}
            >
              Benefits
            </button>
            <button
              onClick={() => handleNavClick("download")}
              className={`nav-link ${activeSection === "download" ? "nav-link-active" : ""}`}
            >
              Download
            </button>

            <div className="nav-divider" />

            <Link
              to="/for-drivers"
              onClick={() => setIsMenuOpen(false)}
              className="nav-link"
            >
              For Drivers
            </Link>

            <div className="mobile-menu-footer">
              <button
                className="get-app-btn"
                onClick={() => setIsMenuOpen(false)}
              >
                Get the App
              </button>
            </div>
          </nav>
          {/* Right: Actions */}
          <div className="header-actions">
            {/* <Link to="/admin-portal/login" className="staff-login-link">
              Staff Login
            </Link> */}
            <button className="get-app-btn">Get the App</button>
          </div>
        </div>
      </header>
      {/* ── END HEADER ──────────────────────────────────────────────────────── */}

      {/* ── MAIN: Dynamic Route Content ───────────────────────────────────── */}
      <main className="landing-main">
        <Outlet />
      </main>
      {/* ── END MAIN ────────────────────────────────────────────────────────── */}

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer ref={footerRef} className="landing-footer">
        <div className="footer-content">
          {/* Col 1 – Brand: Logo, Tagline & Social Links */}
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

          {/* Col 3 – Contact Info, Business Hours & Support Badge */}
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

        {/* Footer Bottom: Copyright & Payment Method Icons */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} PickYou. All rights reserved.</p>
          <div className="footer-actions">
            <div className="payment-methods">
              <FaCreditCard className="pay-icon" title="Credit Card" />
              <FaMoneyBillWave className="pay-icon" title="Cash" />
              <FaMobileAlt className="pay-icon" title="Mobile Pay" />
            </div>
            <div className="footer-divider" />
            <Link
              to="/admin-portal/login"
              className="footer-staff-icon"
              title="Staff Login"
            >
              <FaUserCircle />
            </Link>
          </div>
        </div>
      </footer>
      {/* ── END FOOTER ──────────────────────────────────────────────────────── */}
    </div>
  );
};

export default LandingLayout;
