import React, { useState, useEffect } from "react";
import "./ForDrivers.css";
import {
  FaDollarSign,
  FaCalendarAlt,
  FaBolt,
  FaShieldAlt,
  FaChartBar,
  FaAward,
} from "react-icons/fa";
import DriverDownload from "./DriverDownload";
import happyfamily from "../../../assets/happyfamily.png";
import yourshedule from "../../../assets/yourshedule.png";

// Benefit Images
import earnMoreTrip from "../../../assets/earnmoretrip.png";
import flexibleSchedule from "../../../assets/flexibleshedule.png";
import instantPay from "../../../assets/instantpay.png";
import driverProtection from "../../../assets/support24.png";
import smartAnalytics from "../../../assets/smartanalytics.png";
import driverRewards from "../../../assets/driverrewards.png";
import happyearning from "../../../assets/happyearning.png";

const heroSlides = [
  {
    img: yourshedule, // Placeholder for driver/road
    headline: "Your Vehicle. Your Schedule.",
    sub: "Join the most reliable driver network in Jaffna and take control of your time.",
  },
  {
    img: happyearning, // Placeholder for car/earning
    headline: "Keep More of What You Earn",
    sub: "Industry-leading fare splits. No hidden fees. Instant cash out any time.",
  },
  {
    img: happyfamily, // Placeholder for freedom/map
    headline: "Drive for Your Future",
    sub: "Professional support, insurance coverage, and constant ride requests.",
  },
];

const opportunityStats = [
  {
    value: "High",
    label: "Local Earnings",
    sub: "Keep most of your fares",
    color: "#22c55e",
  },
  {
    value: "Any",
    label: "Time You Want",
    sub: "Drive around Jaffna easily",
    color: "#0e5c6b",
  },
  {
    value: "Wide",
    label: "Network Reach",
    sub: "Growing across Sri Lanka",
    color: "#f59e0b",
  },
  {
    value: "Fast",
    label: "Cash Payouts",
    sub: "Quick access to your money",
    color: "#8b5cf6",
  },
];

const driverBenefits = [
  {
    icon: <FaDollarSign size={22} />,
    color: "#22c55e",
    bg: "#dcfce7",
    title: "Earn More Per Trip",
    desc: "Maximize your daily income with our driver-friendly fare structure. Transparent pay with no hidden deductions.",
    image: earnMoreTrip,
  },
  {
    icon: <FaCalendarAlt size={22} />,
    color: "#0e5c6b",
    bg: "#e0f2fe",
    title: "Flexible Schedule",
    desc: "Drive around Jaffna on your own terms. Morning, evening, or weekends—you are the boss of your own time.",
    image: flexibleSchedule,
  },
  {
    icon: <FaBolt size={22} />,
    color: "#f59e0b",
    bg: "#fef3c7",
    title: "Fast Payments",
    desc: "Access your earnings quickly and reliably with seamless local bank transfers in Sri Lanka.",
    image: instantPay,
  },
  {
    icon: <FaShieldAlt size={22} />,
    color: "#8b5cf6",
    bg: "#ede9fe",
    title: "Driver Safety First",
    desc: "Your safety matters. Enjoy dedicated local support tailored for our Sri Lankan driver partners.",
    image: driverProtection,
  },
  {
    icon: <FaChartBar size={22} />,
    color: "#ef4444",
    bg: "#fee2e2",
    title: "Smart Insights",
    desc: "Know the busiest times and most requested routes across town to optimize your daily earnings.",
    image: smartAnalytics,
  },
  {
    icon: <FaAward size={22} />,
    color: "#0e5c6b",
    bg: "#f0fdf4",
    title: "Local Driver Perks",
    desc: "Hit your weekly trip targets to unlock exclusive local rewards and community-focused perks.",
    image: driverRewards,
  },
];

export default function ForDrivers() {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="for-drivers-page">
      {/* ── Driver Hero Banner with Slideshow ─────────────────────────── */}
      <section className="driver-hero-banner">
        {heroSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`hero-slide-fader ${idx === slideIndex ? "active" : ""}`}
            style={{ opacity: idx === slideIndex ? 1 : 0 }}
          >
            <img src={slide.img} alt={slide.headline} className="hero-slide-img" />
            <div className="hero-overlay" />
          </div>
        ))}

        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-pulse-dot" />
            DRIVE WITH PICKYOU
          </div>
          <h1 className="hero-title">
            {heroSlides[slideIndex].headline.split(". ").map((text, i, arr) => (
              <React.Fragment key={i}>
                {text}{i < arr.length - 1 ? "." : ""} <br />
              </React.Fragment>
            ))}
          </h1>
          <p className="hero-desc">
            {heroSlides[slideIndex].sub}
          </p>
          <div className="hero-actions">
            <a href="#driver-download" className="hero-btn primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Register to Drive</a>
            <button className="hero-btn secondary">View Requirements</button>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="hero-indicators">
          {heroSlides.map((_, idx) => (
            <div
              key={idx}
              className={`indicator-dot ${idx === slideIndex ? "active" : ""}`}
              onClick={() => setSlideIndex(idx)}
            />
          ))}
        </div>
      </section>

      <section id="drivers" className="drivers-section-main">
        <div className="drivers-container-inner">
          {/* Section header */}
          <div className="drivers-header">
            <span className="drivers-badge">FOR DRIVERS</span>
            <h2 className="drivers-title">
              Opportunities Are Endless
              <br />
              With <span className="text-highlight">PickYou</span>
            </h2>
            <p className="drivers-subtitle">
              Join thousands of drivers who've taken control of their income,
              schedule, and future.
            </p>
          </div>

      
          <div className="opportunity-stats-grid">
            {opportunityStats.map((s, i) => (
              <div key={i} className="stat-card">
                <p className="stat-value" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="stat-label">{s.label}</p>
                <p className="stat-sub">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Driver benefits */}
          <div className="driver-benefits-section">
            <h3 className="benefits-section-title">
              Benefits for <span className="text-secondary-highlight">PickYou Drivers</span>
            </h3>
            <div className="driver-benefits-grid">
              {driverBenefits.map((b, i) => (
                <div key={i} className="driver-benefit-card enhanced">
                  <div className="benefit-card-visual">
                    <img src={b.image} alt={b.title} className="benefit-image" />
                    <div className="benefit-icon-overlay" style={{ backgroundColor: b.bg, color: b.color }}>
                      {b.icon}
                    </div>
                  </div>
                  <div className="driver-benefit-content">
                    <h4 className="driver-benefit-title">{b.title}</h4>
                    <p className="driver-benefit-desc">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Driver CTA banner */}
          <div className="driver-cta-banner">
            <div className="cta-banner-text">
              <p className="cta-tag">JOIN THOUSANDS OF DRIVERS</p>
              <h3 className="cta-title">Ready to start earning?</h3>
              <p className="cta-desc">
                Sign up in minutes and start driving as soon as tomorrow.
              </p>
            </div>
            <div className="cta-banner-actions">
              <a href="#" className="cta-btn primary">
                Become a Driver →
              </a>
              <a href="#" className="cta-btn secondary">
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Driver Download Section */}
        <div id="driver-download">
          <DriverDownload />
        </div>
      </section>
    </div>
  );
}
