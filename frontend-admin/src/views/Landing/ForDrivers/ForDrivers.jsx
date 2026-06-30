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

const heroSlides = [
  {
    img: "https://images.unsplash.com/photo-1549491745-f0ea83b7aa94?w=1600&h=900&fit=crop&auto=format", // Placeholder for driver/road
    headline: "Your Vehicle. Your Schedule.",
    sub: "Join the most reliable driver network in Jaffna and take control of your time.",
  },
  {
    img: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1600&h=900&fit=crop&auto=format", // Placeholder for car/earning
    headline: "Keep More of What You Earn",
    sub: "Industry-leading fare splits. No hidden fees. Instant cash out any time.",
  },
  {
    img: "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1600&h=900&fit=crop&auto=format", // Placeholder for freedom/map
    headline: "Drive for Your Future",
    sub: "Professional support, insurance coverage, and constant ride requests.",
  },
];

const opportunityStats = [
  {
    value: "85%",
    label: "Fare you keep",
    sub: "Industry-leading split",
    color: "#22c55e",
  },
  {
    value: "$2,000+",
    label: "Top monthly earnings",
    sub: "For full-time drivers",
    color: "#0e5c6b",
  },
  {
    value: "100+",
    label: "Cities available",
    sub: "And expanding fast",
    color: "#f59e0b",
  },
  {
    value: "24/7",
    label: "Instant cash out",
    sub: "No waiting for pay day",
    color: "#8b5cf6",
  },
];

const driverBenefits = [
  {
    icon: <FaDollarSign size={22} />,
    color: "#22c55e",
    bg: "#dcfce7",
    title: "Earn More Per Trip",
    desc: "Keep up to 85% of every fare. Transparent pay structure with no hidden deductions ever.",
  },
  {
    icon: <FaCalendarAlt size={22} />,
    color: "#0e5c6b",
    bg: "#e0f2fe",
    title: "Flexible Schedule",
    desc: "Drive when you want — morning, evening, weekends. You're the boss of your own time.",
  },
  {
    icon: <FaBolt size={22} />,
    color: "#f59e0b",
    bg: "#fef3c7",
    title: "Instant Pay",
    desc: "Cash out earnings any time, any day. No waiting — money in your account within minutes.",
  },
  {
    icon: <FaShieldAlt size={22} />,
    color: "#8b5cf6",
    bg: "#ede9fe",
    title: "Driver Protection",
    desc: "Full insurance coverage on every trip plus 24/7 emergency support when you need it most.",
  },
  {
    icon: <FaChartBar size={22} />,
    color: "#ef4444",
    bg: "#fee2e2",
    title: "Smart Analytics",
    desc: "Know your best hours, busiest routes, and peak earning windows with built-in insights.",
  },
  {
    icon: <FaAward size={22} />,
    color: "#0e5c6b",
    bg: "#f0fdf4",
    title: "Driver Rewards",
    desc: "Hit weekly trip targets and unlock bonuses, fuel discounts, and exclusive driver perks.",
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
            <button className="hero-btn primary">Register to Drive</button>
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

          {/* Opportunity stats */}
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
                <div key={i} className="driver-benefit-card">
                  <div
                    className="driver-icon-box"
                    style={{ backgroundColor: b.bg, color: b.color }}
                  >
                    {b.icon}
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
